import { sb } from './supabase'
import type { Moeda } from './tipos'

/** Erro de módulo ainda não provisionado no banco (tabela ausente).
    PostgREST devolve 42P01 ou PGRST205 quando a relação não existe. */
export function moduloNaoProvisionado(e: unknown): boolean {
  const err = e as { code?: string; message?: string }
  return err?.code === '42P01' || err?.code === 'PGRST205'
    || /does not exist|schema cache/i.test(err?.message ?? '')
}

export const TITULO_NAO_PROVISIONADO = 'Módulo ainda não liberado'
export const AVISO_NAO_PROVISIONADO =
  'Este módulo já está no sistema, mas o espaço dele no banco de dados ainda não foi criado. '
  + 'Nada foi perdido e nada deu errado — falta um passo de instalação, que é feito pela '
  + 'administração. Assim que for concluído, esta tela funciona sem precisar de nova versão.'


/* ============================================================
   Catálogo — Lote 5.
   Duas naturezas, e a diferença importa na tela:
   · Produto é dado DA organização (isolado por RLS).
   · Legislação e perfil de país são públicos: lei brasileira é a mesma para
     todo mundo. Só admin de plataforma escreve.
   ============================================================ */

export interface Produto {
  id: string
  nome: string
  familia: string | null
  modelo: string | null
  fabricante: string | null
  potenciaW: number | null
  fluxoLm: number | null
  eficaciaLmW: number | null
  temperaturaK: number | null
  irc: number | null
  grauIp: string | null
  grauIk: string | null
  vidaUtilH: number | null
  garantiaMeses: number | null
  certificacoes: string[]
  precoReferencia: number | null
  moeda: Moeda
  capacidadeMensal: number | null
  observacoes: string | null
  ativo: boolean
}

const COLUNAS = `id, nome, familia, modelo, fabricante, potencia_w, fluxo_lm, eficacia_lm_w,
  temperatura_k, irc, grau_ip, grau_ik, vida_util_h, garantia_meses, certificacoes,
  preco_referencia, moeda, capacidade_mensal, observacoes, ativo`

type Linha = Record<string, unknown>
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const t = (v: unknown) => (v === null || v === undefined ? null : String(v))

function paraProduto(l: Linha): Produto {
  return {
    id: String(l.id), nome: String(l.nome ?? ''),
    familia: t(l.familia), modelo: t(l.modelo), fabricante: t(l.fabricante),
    potenciaW: n(l.potencia_w), fluxoLm: n(l.fluxo_lm), eficaciaLmW: n(l.eficacia_lm_w),
    temperaturaK: n(l.temperatura_k), irc: n(l.irc),
    grauIp: t(l.grau_ip), grauIk: t(l.grau_ik),
    vidaUtilH: n(l.vida_util_h), garantiaMeses: n(l.garantia_meses),
    certificacoes: (l.certificacoes as string[]) ?? [],
    precoReferencia: n(l.preco_referencia),
    moeda: (l.moeda as Moeda) ?? 'BRL',
    capacidadeMensal: n(l.capacidade_mensal),
    observacoes: t(l.observacoes),
    ativo: l.ativo !== false,
  }
}

/** Eficácia luminosa: se não vier declarada, deriva de fluxo ÷ potência.
    Derivada e declarada não se misturam na tela — a declarada é a que o
    edital cobra, a derivada é conferência. */
export const eficaciaDerivada = (p: Produto): number | null =>
  p.fluxoLm && p.potenciaW ? p.fluxoLm / p.potenciaW : null

export async function listarProdutos(orgId: string): Promise<Produto[]> {
  if (!sb) return []
  const { data, error } = await sb.schema('x369life').from('products')
    .select(COLUNAS).eq('org_id', orgId).is('excluido_em', null).order('nome')
  if (error) throw error
  return (data ?? []).map((l) => paraProduto(l as Linha))
}

export type NovoProduto = Omit<Produto, 'id'>

function paraLinha(p: NovoProduto): Record<string, unknown> {
  return {
    nome: p.nome, familia: p.familia, modelo: p.modelo, fabricante: p.fabricante,
    potencia_w: p.potenciaW, fluxo_lm: p.fluxoLm, eficacia_lm_w: p.eficaciaLmW,
    temperatura_k: p.temperaturaK, irc: p.irc, grau_ip: p.grauIp, grau_ik: p.grauIk,
    vida_util_h: p.vidaUtilH, garantia_meses: p.garantiaMeses,
    certificacoes: p.certificacoes, preco_referencia: p.precoReferencia,
    moeda: p.moeda, capacidade_mensal: p.capacidadeMensal,
    observacoes: p.observacoes, ativo: p.ativo,
  }
}

export async function salvarProduto(orgId: string, id: string | null, p: NovoProduto) {
  if (!sb) throw new Error('Backend não configurado.')
  const x = sb.schema('x369life')
  const { error } = id
    ? await x.from('products').update(paraLinha(p)).eq('id', id)
    : await x.from('products').insert({ org_id: orgId, ...paraLinha(p) })
  if (error) throw error
}

export async function arquivarProduto(id: string) {
  if (!sb) throw new Error('Backend não configurado.')
  const { error } = await sb.schema('x369life').from('products')
    .update({ excluido_em: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/* ---------------- legislação ---------------- */

export interface Norma {
  id: string
  paisId: string | null
  tipo: 'lei' | 'decreto' | 'norma_tecnica' | 'diretiva' | 'instrucao'
  identificacao: string
  ano: number | null
  titulo: string
  ementa: string | null
  orgao: string | null
  url: string | null
  situacao: 'vigente' | 'revogada' | 'substituida' | 'a_conferir'
  escopo: 'licitacao' | 'tecnico' | 'tributario' | 'ambiental' | 'trabalhista'
  conferidoEm: string | null
}

export const SITUACAO_NORMA: Record<Norma['situacao'], { label: string; cor: string }> = {
  vigente: { label: 'vigente', cor: 'var(--teal)' },
  revogada: { label: 'revogada', cor: 'var(--danger)' },
  substituida: { label: 'substituída', cor: 'var(--amber)' },
  a_conferir: { label: 'a conferir', cor: 'var(--tx3)' },
}

export const ESCOPO_NORMA: Record<Norma['escopo'], string> = {
  licitacao: 'Licitação', tecnico: 'Técnico', tributario: 'Tributário',
  ambiental: 'Ambiental', trabalhista: 'Trabalhista',
}

export async function listarNormas(): Promise<Norma[]> {
  if (!sb) return []
  const { data, error } = await sb.schema('x369life').from('regulations')
    .select('id, pais_id, tipo, identificacao, ano, titulo, ementa, orgao, url, situacao, escopo, conferido_em')
    .order('pais_id', { nullsFirst: false }).order('escopo').order('ano', { ascending: false })
  if (error) throw error
  return (data ?? []).map((l) => ({
    id: String(l.id), paisId: t(l.pais_id), tipo: l.tipo as Norma['tipo'],
    identificacao: String(l.identificacao), ano: n(l.ano), titulo: String(l.titulo),
    ementa: t(l.ementa), orgao: t(l.orgao), url: t(l.url),
    situacao: l.situacao as Norma['situacao'], escopo: l.escopo as Norma['escopo'],
    conferidoEm: t(l.conferido_em),
  }))
}

/* ---------------- perfil de país ---------------- */

export interface PerfilPais {
  paisId: string
  portalCompras: string | null
  portalUrl: string | null
  modalidadePredominante: string | null
  exigeRegistroLocal: boolean | null
  exigeRepresentante: boolean | null
  moedaContrato: string | null
  observacoes: string | null
  conferidoEm: string | null
}

export async function listarPerfisPais(): Promise<PerfilPais[]> {
  if (!sb) return []
  const { data, error } = await sb.schema('x369life').from('country_profiles')
    .select('pais_id, portal_compras, portal_url, modalidade_predominante, exige_registro_local, exige_representante, moeda_contrato, observacoes, conferido_em')
  if (error) throw error
  return (data ?? []).map((l) => ({
    paisId: String(l.pais_id),
    portalCompras: t(l.portal_compras), portalUrl: t(l.portal_url),
    modalidadePredominante: t(l.modalidade_predominante),
    exigeRegistroLocal: l.exige_registro_local as boolean | null,
    exigeRepresentante: l.exige_representante as boolean | null,
    moedaContrato: t(l.moeda_contrato), observacoes: t(l.observacoes),
    conferidoEm: t(l.conferido_em),
  }))
}

/* ---------------- organizações ---------------- */

export interface OrganizacaoResumo {
  id: string
  nome: string
  paisOrigem: string | null
  status: string | null
  membros: number
  criadoEm: string | null
}

export async function listarOrganizacoes(): Promise<OrganizacaoResumo[]> {
  if (!sb) return []
  const { data, error } = await sb.schema('x369life').from('organizations')
    .select('id, nome, pais_origem, status, criado_em, memberships(user_id)')
  if (error) throw error
  return (data ?? []).map((l) => ({
    id: String(l.id), nome: String(l.nome ?? ''),
    paisOrigem: t(l.pais_origem), status: t(l.status),
    membros: Array.isArray(l.memberships) ? l.memberships.length : 0,
    criadoEm: t(l.criado_em),
  }))
}
