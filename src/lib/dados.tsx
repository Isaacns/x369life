/* ============================================================
   Camada de dados. Uma interface só para a UI; a origem muda por baixo.
   · Modo demonstrativo: memória + localStorage (persiste no aparelho).
   · Modo real: Supabase com RLS por organização — as funções abaixo
     viram consultas/RPCs sem mudar nenhuma tela.
   ============================================================ */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MODO_DEMO } from '../app.config'
import { sb } from './supabase'
import { OPORTUNIDADES_DEMO, PERFIL_DEMO, USUARIOS_DEMO } from './demo'
import type { EtapaPipeline, Decisao, Oportunidade, PerfilOrganizacao, Usuario } from './tipos'
import { PESOS_ADERENCIA_PADRAO } from './scoring'

const CHAVE = 'x369_dados_v1'

interface Estado {
  carregando: boolean
  /** Organização ativa. Em modo demonstrativo é fixa; no real vem do banco. */
  orgId: string | null
  orgNome: string | null
  /** Autenticado mas sem organização — precisa passar pelo onboarding. */
  precisaOnboarding: boolean
  recarregarOrg: () => Promise<void>
  oportunidades: Oportunidade[]
  usuarios: Usuario[]
  perfilOrg: PerfilOrganizacao
  pesos: Record<string, number>
  setPesos: (p: Record<string, number>) => void
  moverEtapa: (id: string, etapa: EtapaPipeline) => void
  registrarDecisao: (id: string, d: Decisao, justificativa: string, responsavel: string) => void
  salvarUsuario: (u: Usuario) => void
  removerUsuario: (id: string) => void
}

const Ctx = createContext<Estado | null>(null)
export function useDados() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDados fora do DadosProvider')
  return v
}

interface Persistido {
  etapas: Record<string, EtapaPipeline>
  decisoes: Record<string, { d: Decisao; j: string; r: string }>
  usuarios: Usuario[]
  pesos: Record<string, number>
}

function ler(): Partial<Persistido> {
  try { return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') } catch { return {} }
}

export function DadosProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [pesos, setPesosState] = useState<Record<string, number>>(PESOS_ADERENCIA_PADRAO)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgNome, setOrgNome] = useState<string | null>(null)
  const [semOrg, setSemOrg] = useState(false)

  /** No modo real, a organização vem do vínculo em x369life.memberships.
      A carteira de oportunidades ainda é o conjunto demonstrativo — o porte
      da camada de dados para o Supabase é o próximo lote, e a tela declara
      isso com a faixa "Dados demonstrativos". */
  async function carregarOrg() {
    if (MODO_DEMO || !sb) { setSemOrg(false); return }
    const { data, error } = await sb
      .schema('x369life')
      .from('memberships')
      .select('org_id, organizations(id, nome)')
      .eq('ativo', true)
      .limit(1)
    if (error) { console.error(error); setSemOrg(false); return }
    // O embed do PostgREST volta como lista; achatamos aqui.
    const primeira = data?.[0] as unknown as
      { org_id: string; organizations: { nome: string } | { nome: string }[] | null } | undefined
    if (!primeira) { setOrgId(null); setOrgNome(null); setSemOrg(true); return }
    const org = Array.isArray(primeira.organizations) ? primeira.organizations[0] : primeira.organizations
    setOrgId(primeira.org_id)
    setOrgNome(org?.nome ?? null)
    setSemOrg(false)
  }

  useEffect(() => {
    void carregarOrg()
    const p = ler()
    setOportunidades(
      OPORTUNIDADES_DEMO.map((o) => {
        const dec = p.decisoes?.[o.id]
        return {
          ...o,
          etapa: p.etapas?.[o.id] ?? o.etapa,
          decisao: dec?.d ?? o.decisao,
          decisaoJustificativa: dec?.j ?? o.decisaoJustificativa,
        }
      }),
    )
    setUsuarios(p.usuarios ?? USUARIOS_DEMO)
    setPesosState(p.pesos ?? PESOS_ADERENCIA_PADRAO)
    setCarregando(false)
  }, [])

  function persistir(patch: Partial<Persistido>) {
    if (!MODO_DEMO) return
    localStorage.setItem(CHAVE, JSON.stringify({ ...ler(), ...patch }))
  }

  const valor = useMemo<Estado>(() => ({
    carregando, oportunidades, usuarios, pesos,
    orgId, orgNome, precisaOnboarding: semOrg,
    recarregarOrg: carregarOrg,
    perfilOrg: orgNome ? { ...PERFIL_DEMO, nome: orgNome } : PERFIL_DEMO,

    setPesos: (novos) => { setPesosState(novos); persistir({ pesos: novos }) },

    moverEtapa: (id, etapa) => {
      setOportunidades((s) => {
        const nova = s.map((o) => (o.id === id ? { ...o, etapa } : o))
        persistir({ etapas: Object.fromEntries(nova.map((o) => [o.id, o.etapa])) })
        return nova
      })
    },

    registrarDecisao: (id, d, j, r) => {
      setOportunidades((s) => {
        const nova = s.map((o) => (o.id === id ? { ...o, decisao: d, decisaoJustificativa: j, responsavel: r || o.responsavel } : o))
        const dec = ler().decisoes ?? {}
        persistir({ decisoes: { ...dec, [id]: { d, j, r } } })
        return nova
      })
    },

    salvarUsuario: (u) => {
      setUsuarios((s) => {
        const existe = s.some((x) => x.id === u.id)
        const nova = existe ? s.map((x) => (x.id === u.id ? u : x)) : [...s, u]
        persistir({ usuarios: nova })
        return nova
      })
    },

    removerUsuario: (id) => {
      setUsuarios((s) => {
        const nova = s.filter((x) => x.id !== id)
        persistir({ usuarios: nova })
        return nova
      })
    },
  }), [carregando, oportunidades, usuarios, pesos, orgId, orgNome, semOrg])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

/** Aplica os pesos configurados pelo administrador sobre os componentes. */
export function comPesos(o: Oportunidade, pesos: Record<string, number>): Oportunidade {
  return { ...o, componentesAderencia: o.componentesAderencia.map((c) => ({ ...c, peso: pesos[c.id] ?? c.peso })) }
}
