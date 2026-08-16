/* ============================================================
   Camada de dados. Uma interface só para a UI; a origem muda por baixo.
   · Modo real: Supabase, schema x369life, com RLS por organização.
   · Modo demonstrativo (build sem VITE_SUPABASE_*): memória + localStorage.

   As telas não sabem qual dos dois está ativo — falam sempre em `Oportunidade`.
   ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MODO_DEMO } from '../app.config'
import { sb } from './supabase'
import { OPORTUNIDADES_DEMO, PERFIL_DEMO, USUARIOS_DEMO } from './demo'
import { paraLinha, paraOportunidade, SELECT_OPORTUNIDADE, type NovaOportunidade } from './mapear'
import { avaliar, PESOS_ADERENCIA_PADRAO } from './scoring'
import type { EtapaPipeline, Decisao, Oportunidade, PerfilOrganizacao, Usuario } from './tipos'
import { useAuth } from '../auth/AuthContext'

const CHAVE = 'x369_dados_v1'

interface Estado {
  carregando: boolean
  erro: string | null
  orgId: string | null
  orgNome: string | null
  precisaOnboarding: boolean
  recarregarOrg: () => Promise<void>
  recarregar: () => Promise<void>

  oportunidades: Oportunidade[]
  usuarios: Usuario[]
  perfilOrg: PerfilOrganizacao
  pesos: Record<string, number>

  setPesos: (p: Record<string, number>) => Promise<void>
  moverEtapa: (id: string, etapa: EtapaPipeline) => Promise<void>
  registrarDecisao: (id: string, d: Decisao, justificativa: string, responsavel: string) => Promise<void>
  criarOportunidade: (n: NovaOportunidade) => Promise<string | null>
  salvarUsuario: (u: Usuario) => Promise<string | null>
  removerUsuario: (id: string) => Promise<void>
  semearDemonstrativos: () => Promise<string | null>
  limparDemonstrativos: () => Promise<void>
}

const Ctx = createContext<Estado | null>(null)
export function useDados() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDados fora do DadosProvider')
  return v
}

/* ---------- persistência local, só no modo demonstrativo ---------- */
interface Persistido {
  etapas: Record<string, EtapaPipeline>
  decisoes: Record<string, { d: Decisao; j: string; r: string }>
  usuarios: Usuario[]
  pesos: Record<string, number>
}
const ler = (): Partial<Persistido> => {
  try { return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') } catch { return {} }
}
const persistir = (patch: Partial<Persistido>) => {
  if (MODO_DEMO) localStorage.setItem(CHAVE, JSON.stringify({ ...ler(), ...patch }))
}

const msg = (e: unknown) => (e as { message?: string })?.message ?? 'Falha ao falar com o servidor.'

export function DadosProvider({ children }: { children: ReactNode }) {
  const { usuario, atualizarUsuario } = useAuth()
  // carregarOrg roda uma vez e não deve reagir a cada render do usuário;
  // as refs dão acesso ao valor corrente sem virar dependência.
  const usuarioRef = useRef(usuario)
  const atualizarUsuarioRef = useRef(atualizarUsuario)
  usuarioRef.current = usuario
  atualizarUsuarioRef.current = atualizarUsuario
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [pesos, setPesosState] = useState<Record<string, number>>(PESOS_ADERENCIA_PADRAO)
  const [perfilOrg, setPerfilOrg] = useState<PerfilOrganizacao>(PERFIL_DEMO)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgNome, setOrgNome] = useState<string | null>(null)
  const [semOrg, setSemOrg] = useState(false)

  /* ---------------- organização ---------------- */
  const carregarOrg = useCallback(async () => {
    if (MODO_DEMO || !sb) { setSemOrg(false); return null }
    const x = sb.schema('x369life')
    const { data, error } = await x
      .from('memberships')
      .select('org_id, role, organizations(id, nome, pais_origem)')
      .eq('ativo', true).limit(1)
    if (error) { setErro(msg(error)); return null }
    const linha = data?.[0] as unknown as
      { org_id: string; role: string; organizations: { nome: string } | { nome: string }[] | null } | undefined
    if (!linha) { setOrgId(null); setOrgNome(null); setSemOrg(true); return null }
    const org = Array.isArray(linha.organizations) ? linha.organizations[0] : linha.organizations
    setOrgId(linha.org_id); setOrgNome(org?.nome ?? null); setSemOrg(false)

    // O papel real vem do RBAC — a sessão sozinha não sabe qual é. Quem é
    // administrador de plataforma enxerga como owner em qualquer organização,
    // que é exatamente o que a policy no banco já concede.
    // A policy pa_sel só devolve linha para quem é admin de plataforma:
    // para os demais a consulta volta vazia, sem erro.
    const [{ data: pa }, { data: perfilLinha }] = await Promise.all([
      x.from('platform_admins').select('user_id').limit(1),
      x.from('profiles').select('nome, foto_url, tratamento')
        .eq('id', usuarioRef.current?.id ?? '').maybeSingle(),
    ])
    const papel = (pa && pa.length > 0) ? 'owner' : linha.role
    atualizarUsuarioRef.current?.({
      perfil: papel,
      ...(perfilLinha?.nome ? { nome: perfilLinha.nome as string } : {}),
      fotoUrl: (perfilLinha?.foto_url as string | null) ?? undefined,
      tratamento: (perfilLinha?.tratamento as string | undefined) ?? 'neutro',
    })
    return linha.org_id
  }, [])

  /* ---------------- carga completa ---------------- */
  const carregarTudo = useCallback(async (org: string) => {
    if (!sb) return
    const x = sb.schema('x369life')

    // Pesos primeiro: a aderência de cada oportunidade depende deles.
    const { data: dp } = await x.from('fit_weight_profiles')
      .select('pesos').eq('org_id', org).eq('ativo', true)
      .order('versao', { ascending: false }).limit(1)
    const pesosAtivos = (dp?.[0]?.pesos as Record<string, number> | undefined) ?? PESOS_ADERENCIA_PADRAO
    setPesosState(pesosAtivos)

    const [ops, membros, perfil] = await Promise.all([
      x.from('opportunities').select(SELECT_OPORTUNIDADE)
        .eq('org_id', org).is('excluido_em', null)
        .order('prazo', { ascending: true, nullsFirst: false }),
      x.from('memberships').select('role, ativo, profiles(id, nome, email, foto_url)').eq('org_id', org),
      x.from('organization_profiles').select('*').eq('org_id', org).maybeSingle(),
    ])

    if (ops.error) { setErro(msg(ops.error)); return }
    setOportunidades((ops.data ?? []).map((l) => paraOportunidade(l as never, pesosAtivos)))

    if (!membros.error) {
      setUsuarios((membros.data ?? []).map((m) => {
        const p = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as
          { id: string; nome: string | null; email: string | null; foto_url: string | null } | null
        return {
          id: p?.id ?? '', nome: p?.nome ?? '—', email: p?.email ?? '—',
          perfil: m.role as string, ativo: m.ativo as boolean,
          fotoUrl: p?.foto_url ?? undefined,
        }
      }).filter((u) => u.id))
    }

    if (perfil.data) {
      const d = perfil.data as Record<string, unknown>
      setPerfilOrg({
        nome: orgNome ?? PERFIL_DEMO.nome,
        paisOrigem: String(d.pais_origem ?? 'br'),
        tipo: PERFIL_DEMO.tipo,
        paisesInteresse: (d.paises_interesse as string[]) ?? [],
        produtos: (d.produtos as string[]) ?? [],
        certificacoes: (d.certificacoes as string[]) ?? [],
        capacidadeMensal: String(d.capacidade_mensal ?? '—'),
        faixaMin: Number(d.faixa_min ?? 0),
        faixaMax: Number(d.faixa_max ?? 0),
        moeda: (d.moeda_padrao as PerfilOrganizacao['moeda']) ?? 'BRL',
        historicoPropostas: Number(d.historico_propostas ?? 0),
        historicoVitorias: Number(d.historico_vitorias ?? 0),
      })
    }
  }, [orgNome])

  const recarregar = useCallback(async () => {
    if (MODO_DEMO) return
    const org = orgId ?? await carregarOrg()
    if (org) await carregarTudo(org)
  }, [orgId, carregarOrg, carregarTudo])

  /* ---------------- primeira carga ---------------- */
  useEffect(() => {
    let vivo = true
    void (async () => {
      if (MODO_DEMO) {
        const p = ler()
        setOportunidades(OPORTUNIDADES_DEMO.map((o) => {
          const dec = p.decisoes?.[o.id]
          return {
            ...o,
            etapa: p.etapas?.[o.id] ?? o.etapa,
            decisao: dec?.d ?? o.decisao,
            decisaoJustificativa: dec?.j ?? o.decisaoJustificativa,
          }
        }))
        setUsuarios(p.usuarios ?? USUARIOS_DEMO)
        setPesosState(p.pesos ?? PESOS_ADERENCIA_PADRAO)
        setCarregando(false)
        return
      }
      const org = await carregarOrg()
      if (org && vivo) await carregarTudo(org)
      if (vivo) setCarregando(false)
    })()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------- escritas ---------------- */

  const moverEtapa = useCallback(async (id: string, etapa: EtapaPipeline) => {
    // otimista: a tela responde na hora; se o banco recusar, revertemos.
    const antes = oportunidades
    setOportunidades((s) => s.map((o) => (o.id === id ? { ...o, etapa } : o)))
    if (MODO_DEMO) {
      persistir({ etapas: Object.fromEntries(antes.map((o) => [o.id, o.id === id ? etapa : o.etapa])) })
      return
    }
    const { error } = await sb!.schema('x369life').from('opportunities')
      .update({ etapa }).eq('id', id)
    if (error) { setErro(msg(error)); setOportunidades(antes) }
  }, [oportunidades])

  const registrarDecisao = useCallback(async (
    id: string, d: Decisao, justificativa: string, responsavel: string,
  ) => {
    if (MODO_DEMO) {
      setOportunidades((s) => s.map((o) => (o.id === id
        ? { ...o, decisao: d, decisaoJustificativa: justificativa, responsavel: responsavel || o.responsavel }
        : o)))
      persistir({ decisoes: { ...(ler().decisoes ?? {}), [id]: { d, j: justificativa, r: responsavel } } })
      return
    }
    const o = oportunidades.find((x) => x.id === id)
    if (!o || !orgId || !usuario) return
    // Retrato do cálculo no momento da decisão: sem isso, recalcular apaga o porquê.
    const a = avaliar(o, perfilOrg)
    const { error } = await sb!.schema('x369life').from('decisions').insert({
      org_id: orgId, opportunity_id: id, decisao: d, justificativa,
      responsavel_id: usuario.id,          // a policy exige = auth.uid()
      aderencia_nota: a.aderencia.nota,
      aderencia_confianca: a.aderencia.confianca,
      risco_score: a.risco.score,
      probabilidade: Number(a.probabilidade.p.toFixed(4)),
    })
    if (error) { setErro(msg(error)); return }
    await recarregar()
  }, [oportunidades, orgId, usuario, perfilOrg, recarregar])

  const criarOportunidade = useCallback(async (n: NovaOportunidade): Promise<string | null> => {
    if (MODO_DEMO) return 'Cadastro exige o backend configurado.'
    if (!orgId || !usuario) return 'Organização não carregada.'
    const x = sb!.schema('x369life')
    const { data, error } = await x.from('opportunities')
      .insert(paraLinha(n, orgId, usuario.id)).select('id').single()
    if (error) return msg(error)

    const criterios = Object.entries(n.componentes)
      .filter(([, v]) => v !== null)
      .map(([criterio, score]) => ({
        org_id: orgId, opportunity_id: data.id, criterio, score,
        atualizado_por: usuario.id,
      }))
    if (criterios.length) {
      const { error: e2 } = await x.from('fit_components').insert(criterios)
      if (e2) return msg(e2)
    }
    await recarregar()
    return null
  }, [orgId, usuario, recarregar])

  const setPesos = useCallback(async (novos: Record<string, number>) => {
    setPesosState(novos)
    if (MODO_DEMO) { persistir({ pesos: novos }); return }
    if (!orgId || !usuario) return
    const x = sb!.schema('x369life')
    // Versiona em vez de sobrescrever: avaliação histórica não se reescreve.
    const { data } = await x.from('fit_weight_profiles')
      .select('versao').eq('org_id', orgId).order('versao', { ascending: false }).limit(1)
    const proxima = (data?.[0]?.versao ?? 0) + 1
    await x.from('fit_weight_profiles').update({ ativo: false }).eq('org_id', orgId)
    const { error } = await x.from('fit_weight_profiles')
      .insert({ org_id: orgId, versao: proxima, pesos: novos, ativo: true, criado_por: usuario.id })
    if (error) { setErro(msg(error)); return }
    await recarregar()
  }, [orgId, usuario, recarregar])

  const salvarUsuario = useCallback(async (u: Usuario): Promise<string | null> => {
    if (MODO_DEMO) {
      setUsuarios((s) => {
        const nova = s.some((x) => x.id === u.id) ? s.map((x) => (x.id === u.id ? u : x)) : [...s, u]
        persistir({ usuarios: nova }); return nova
      })
      return null
    }
    if (!orgId) return 'Organização não carregada.'
    const x = sb!.schema('x369life')
    const existente = usuarios.some((v) => v.id === u.id)
    if (existente) {
      const { error } = await x.from('memberships')
        .update({ role: u.perfil, ativo: u.ativo }).eq('org_id', orgId).eq('user_id', u.id)
      if (error) return msg(error)
    } else {
      // Só vincula quem já tem conta — o cadastro público está desativado
      // no vizio-core de propósito. A RPC devolve mensagem clara se não existir.
      const { error } = await x.rpc('adicionar_membro', {
        p_org: orgId, p_email: u.email, p_role: u.perfil,
      })
      if (error) return msg(error)
    }
    await recarregar()
    return null
  }, [orgId, usuarios, recarregar])

  const removerUsuario = useCallback(async (id: string) => {
    if (MODO_DEMO) {
      setUsuarios((s) => { const nova = s.filter((x) => x.id !== id); persistir({ usuarios: nova }); return nova })
      return
    }
    if (!orgId) return
    // Desativa em vez de apagar: preserva a trilha de quem decidiu o quê.
    const { error } = await sb!.schema('x369life').from('memberships')
      .update({ ativo: false }).eq('org_id', orgId).eq('user_id', id)
    if (error) { setErro(msg(error)); return }
    await recarregar()
  }, [orgId, recarregar])

  /* ---------------- conjunto demonstrativo ---------------- */

  const semearDemonstrativos = useCallback(async (): Promise<string | null> => {
    if (MODO_DEMO) return null
    if (!orgId || !usuario) return 'Organização não carregada.'
    const x = sb!.schema('x369life')
    for (const o of OPORTUNIDADES_DEMO) {
      const { data, error } = await x.from('opportunities').insert({
        org_id: orgId, titulo: o.titulo, comprador: o.comprador, pais_id: o.paisId,
        tipo: o.tipo, produtos: o.produtos, valor: o.valor, moeda: o.moeda,
        publicacao: o.publicacao || null, prazo: o.prazo || null,
        fonte_texto: o.fonte, fonte_url: o.fonteUrl ?? null, financiamento: o.financiamento,
        exige_parceiro_local: o.exigeParceiroLocal,
        concorrentes_estimados: o.concorrentesEstimados,
        etapa: o.etapa, responsavel_id: usuario.id, criado_por: usuario.id,
        eh_demo: true,
      }).select('id').single()
      if (error) return msg(error)
      const oid = data.id

      const comps = o.componentesAderencia.filter((c) => c.score !== null)
        .map((c) => ({ org_id: orgId, opportunity_id: oid, criterio: c.id, score: c.score, atualizado_por: usuario.id }))
      if (comps.length) await x.from('fit_components').insert(comps)

      if (o.riscos.length) {
        await x.from('risk_items').insert(o.riscos.map((r) => ({
          org_id: orgId, opportunity_id: oid, categoria: r.categoria, descricao: r.descricao,
          probabilidade: r.probabilidade, impacto: r.impacto, evidencia: r.evidencia,
          mitigacao: r.mitigacao, criado_por: usuario.id,
        })))
      }
      if (o.documentos.length) {
        await x.from('required_documents').insert(o.documentos.map((d) => ({
          org_id: orgId, opportunity_id: oid, nome: d.nome, categoria: d.categoria,
          obrigatorio: d.obrigatorio, prazo: d.prazo ?? null, status: d.status,
          risco_inabilitacao: d.riscoInabilitacao, obs: d.obs ?? null,
        })))
      }
      if (o.prazos.length) {
        await x.from('opportunity_deadlines').insert(o.prazos.map((p, i) => ({
          org_id: orgId, opportunity_id: oid, marco: p.label, data: p.data, ordem: i,
        })))
      }
      if (o.swot.length) {
        await x.from('swot_items').insert(o.swot.map((s) => ({
          org_id: orgId, opportunity_id: oid, categoria: s.categoria, descricao: s.descricao,
          impacto: s.impacto, recomendacao: s.recomendacao ?? null, validado: s.validado,
          origem: 'humano',
        })))
      }
      if (o.pestel.length) {
        await x.from('pestel_factors').insert(o.pestel.map((f) => ({
          org_id: orgId, opportunity_id: oid, categoria: f.categoria, descricao: f.descricao,
          fonte: f.fonte, tendencia: f.tendencia, impacto: f.impacto, incerteza: f.incerteza,
        })))
      }
      if (o.viabilidade) {
        await x.from('viability_analyses').insert({
          opportunity_id: oid, org_id: orgId,
          receita: o.viabilidade.receita, custos: o.viabilidade.custos,
          tributos: o.viabilidade.tributos, logistica: o.viabilidade.logistica,
          capital_giro: o.viabilidade.capitalGiro,
          prazo_recebimento_dias: o.viabilidade.prazoRecebimentoDias,
        })
      }
    }
    await recarregar()
    return null
  }, [orgId, usuario, recarregar])

  const limparDemonstrativos = useCallback(async () => {
    if (MODO_DEMO || !orgId) return
    // Exclusão lógica: a base guarda o que existiu.
    const { error } = await sb!.schema('x369life').from('opportunities')
      .update({ excluido_em: new Date().toISOString() })
      .eq('org_id', orgId).eq('eh_demo', true).is('excluido_em', null)
    if (error) { setErro(msg(error)); return }
    await recarregar()
  }, [orgId, recarregar])

  const valor = useMemo<Estado>(() => ({
    carregando, erro, orgId, orgNome, precisaOnboarding: semOrg,
    recarregarOrg: async () => { await carregarOrg() },
    recarregar,
    oportunidades, usuarios, pesos,
    perfilOrg: MODO_DEMO ? PERFIL_DEMO : { ...perfilOrg, nome: orgNome ?? perfilOrg.nome },
    setPesos, moverEtapa, registrarDecisao, criarOportunidade,
    salvarUsuario, removerUsuario, semearDemonstrativos, limparDemonstrativos,
  }), [carregando, erro, orgId, orgNome, semOrg, carregarOrg, recarregar, oportunidades,
    usuarios, pesos, perfilOrg, setPesos, moverEtapa, registrarDecisao, criarOportunidade,
    salvarUsuario, removerUsuario, semearDemonstrativos, limparDemonstrativos])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

/** Aplica os pesos configurados sobre os componentes de uma oportunidade. */
export function comPesos(o: Oportunidade, pesos: Record<string, number>): Oportunidade {
  return { ...o, componentesAderencia: o.componentesAderencia.map((c) => ({ ...c, peso: pesos[c.id] ?? c.peso })) }
}
