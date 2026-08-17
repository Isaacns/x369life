/* ============================================================
   Tradução banco ↔ domínio.
   O resto do app não sabe que o Supabase existe: continua falando
   em `Oportunidade`. Toda a diferença de forma mora aqui.
   ============================================================ */
import { ROTULOS_ADERENCIA, PESOS_ADERENCIA_PADRAO } from './scoring'
import type {
  ComponenteAderencia, Decisao, DocumentoExigido, EtapaPipeline, FatorPestel,
  ItemRisco, ItemSwot, Moeda, Oportunidade, Prazo, Viabilidade,
} from './tipos'

/** Colunas que o front pede ao PostgREST, com os agregados embutidos. */
export const SELECT_OPORTUNIDADE = `
  id, titulo, comprador, pais_id, tipo, produtos, valor, moeda, publicacao, prazo,
  fonte_texto, fonte_url, financiamento, exige_parceiro_local, concorrentes_estimados,
  etapa, eh_demo, responsavel_id,
  responsavel:profiles!opportunities_responsavel_id_fkey(nome),
  fit_components(criterio, score, nota),
  risk_items(id, categoria, descricao, probabilidade, impacto, evidencia, mitigacao),
  required_documents(id, nome, categoria, obrigatorio, prazo, status, risco_inabilitacao, obs),
  opportunity_deadlines(id, marco, data, ordem),
  swot_items(id, categoria, descricao, evidencia, impacto, recomendacao, validado),
  pestel_factors(id, categoria, descricao, fonte, tendencia, impacto, incerteza),
  viability_analyses(receita, custos, tributos, logistica, capital_giro, prazo_recebimento_dias),
  decisions(decisao, justificativa, criado_em)
`.replace(/\s+/g, ' ').trim()

interface LinhaOportunidade {
  id: string; titulo: string; comprador: string; pais_id: string | null
  tipo: string | null; produtos: string[] | null; valor: string | number | null
  moeda: Moeda; publicacao: string | null; prazo: string | null
  fonte_texto: string | null; fonte_url: string | null; financiamento: string | null
  exige_parceiro_local: boolean; concorrentes_estimados: number | null
  etapa: EtapaPipeline; eh_demo: boolean; responsavel_id: string | null
  responsavel: { nome: string | null } | { nome: string | null }[] | null
  fit_components: { criterio: string; score: number | null; nota: string | null }[] | null
  risk_items: ItemRisco[] | null
  required_documents: Record<string, unknown>[] | null
  opportunity_deadlines: { id: string; marco: string; data: string; ordem: number }[] | null
  swot_items: Record<string, unknown>[] | null
  pestel_factors: Record<string, unknown>[] | null
  viability_analyses: Record<string, unknown> | Record<string, unknown>[] | null
  decisions: { decisao: Decisao; justificativa: string; criado_em: string }[] | null
}

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v))
/** O PostgREST devolve embed 1:1 ora como objeto, ora como lista de um. */
const um = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

/** Monta os 9 componentes SEMPRE — critério ausente no banco vira `score: null`,
    que é exatamente "dado ausente" (§16). Não existe aderência com 7 critérios. */
function montarComponentes(
  linhas: { criterio: string; score: number | null }[] | null,
  pesos: Record<string, number>,
): ComponenteAderencia[] {
  const porCriterio = new Map((linhas ?? []).map((l) => [l.criterio, l.score]))
  return Object.keys(PESOS_ADERENCIA_PADRAO).map((id) => ({
    id,
    label: ROTULOS_ADERENCIA[id],
    peso: pesos[id] ?? PESOS_ADERENCIA_PADRAO[id],
    score: porCriterio.has(id) ? (porCriterio.get(id) ?? null) : null,
  }))
}

export function paraOportunidade(
  l: LinhaOportunidade, pesos: Record<string, number>,
): Oportunidade {
  const viab = um(l.viability_analyses) as Record<string, unknown> | null
  const viabilidade: Viabilidade | null = viab ? {
    receita: num(viab.receita), custos: num(viab.custos), tributos: num(viab.tributos),
    logistica: num(viab.logistica), capitalGiro: num(viab.capital_giro),
    prazoRecebimentoDias: num(viab.prazo_recebimento_dias),
  } : null

  // decisions é append-only: a vigente é a mais recente.
  const decisoes = [...(l.decisions ?? [])]
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
  const vigente = decisoes[0]

  return {
    id: l.id,
    titulo: l.titulo,
    comprador: l.comprador,
    paisId: l.pais_id ?? 'br',
    tipo: l.tipo ?? '—',
    produtos: l.produtos ?? [],
    valor: num(l.valor),
    moeda: l.moeda,
    publicacao: l.publicacao ?? '',
    prazo: (l.prazo as string | null) ?? null,
    fonte: l.fonte_texto ?? '—',
    fonteUrl: l.fonte_url ?? undefined,
    financiamento: l.financiamento ?? '—',
    exigeParceiroLocal: l.exige_parceiro_local,
    concorrentesEstimados: l.concorrentes_estimados,
    etapa: l.etapa,
    responsavel: um(l.responsavel)?.nome ?? '—',
    decisao: vigente?.decisao,
    decisaoJustificativa: vigente?.justificativa,
    demo: l.eh_demo,
    componentesAderencia: montarComponentes(l.fit_components, pesos),
    riscos: (l.risk_items ?? []) as ItemRisco[],
    documentos: (l.required_documents ?? []).map((d) => ({
      id: String(d.id), nome: String(d.nome), categoria: String(d.categoria ?? '—'),
      obrigatorio: Boolean(d.obrigatorio),
      prazo: (d.prazo as string | null) ?? undefined,
      status: d.status as DocumentoExigido['status'],
      riscoInabilitacao: d.risco_inabilitacao as DocumentoExigido['riscoInabilitacao'],
      obs: (d.obs as string | null) ?? undefined,
    })),
    prazos: [...(l.opportunity_deadlines ?? [])]
      .sort((a, b) => a.ordem - b.ordem || a.data.localeCompare(b.data))
      .map<Prazo>((p) => ({ id: p.id, label: p.marco, data: p.data })),
    swot: (l.swot_items ?? []).map((s) => ({
      id: String(s.id), categoria: s.categoria as ItemSwot['categoria'],
      descricao: String(s.descricao), impacto: Number(s.impacto) as ItemSwot['impacto'],
      recomendacao: (s.recomendacao as string | null) ?? undefined,
      validado: Boolean(s.validado),
    })),
    pestel: (l.pestel_factors ?? []).map((f) => ({
      id: String(f.id), categoria: f.categoria as FatorPestel['categoria'],
      descricao: String(f.descricao), fonte: String(f.fonte),
      tendencia: f.tendencia as FatorPestel['tendencia'],
      impacto: Number(f.impacto) as FatorPestel['impacto'],
      incerteza: f.incerteza as FatorPestel['incerteza'],
    })),
    viabilidade,
    camposExtraidos: [],   // Lote 2 — extração documental com evidência
  }
}

/* ---------- domínio → banco (cadastro manual) ---------- */

export interface NovaOportunidade {
  titulo: string; comprador: string; paisId: string; tipo: string
  produtos: string[]; valor: number; moeda: Moeda
  publicacao: string; prazo: string; fonte: string; fonteUrl: string
  financiamento: string; exigeParceiroLocal: boolean
  concorrentesEstimados: number | null
  componentes: Record<string, number | null>
}

export function paraLinha(n: NovaOportunidade, orgId: string, userId: string) {
  return {
    org_id: orgId,
    titulo: n.titulo.trim(),
    comprador: n.comprador.trim(),
    pais_id: n.paisId,
    tipo: n.tipo.trim() || null,
    produtos: n.produtos,
    valor: n.valor,
    moeda: n.moeda,
    publicacao: n.publicacao || null,
    prazo: n.prazo || null,
    fonte_texto: n.fonte.trim() || null,
    fonte_url: n.fonteUrl.trim() || null,
    financiamento: n.financiamento.trim() || null,
    exige_parceiro_local: n.exigeParceiroLocal,
    concorrentes_estimados: n.concorrentesEstimados,
    etapa: 'identificada' as EtapaPipeline,
    responsavel_id: userId,
    criado_por: userId,
    eh_demo: false,
  }
}
