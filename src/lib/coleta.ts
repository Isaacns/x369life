import { sb } from './supabase'

/* ============================================================
   Coleta automática nos portais oficiais.

   O X369life deixa de ser só estação de análise: os editais abertos chegam
   sozinhos dos órgãos. Começa pelo PNCP (Brasil); os outros países entram
   como conectores irmãos, com a mesma trilha e a mesma forma de resposta.
   ============================================================ */

export interface Conector {
  id: string
  nome: string
  pais: string
  orgao: string
  url: string
}

export const CONECTORES: Conector[] = [
  {
    id: 'pncp',
    nome: 'PNCP',
    pais: 'br',
    orgao: 'Portal Nacional de Contratações Públicas',
    url: 'https://pncp.gov.br',
  },
]

export interface Rodada {
  id: string
  conector: string
  iniciadoEm: string
  concluidoEm: string | null
  situacao: 'rodando' | 'concluida' | 'falhou'
  paginasLidas: number
  encontrados: number
  aderentes: number
  novos: number
  atualizados: number
  erro: string | null
}

export interface ResultadoColeta {
  ok: boolean
  parcial?: boolean
  aviso?: string | null
  encontrados?: number
  aderentes?: number
  novos?: number
  atualizados?: number
  erro?: string
}

/** Dispara a coleta. A função roda no servidor: a chave de serviço e o
    acesso ao portal nunca passam pelo navegador. */
export async function coletar(orgId: string, dias = 60): Promise<ResultadoColeta> {
  if (!sb) throw new Error('Backend não configurado.')
  const { data, error } = await sb.functions.invoke('coletar-pncp', {
    body: { org_id: orgId, dias, max_paginas: 6 },
  })
  if (error) {
    // O corpo do erro traz a mensagem útil; `error.message` sozinho diz só
    // "non-2xx status", que não ajuda ninguém.
    const detalhe = (data as ResultadoColeta | null)?.erro
    throw new Error(detalhe ?? error.message)
  }
  return data as ResultadoColeta
}

export async function ultimasRodadas(orgId: string, limite = 5): Promise<Rodada[]> {
  if (!sb) return []
  const { data, error } = await sb.schema('x369life').from('ingestion_runs')
    .select('id, conector, iniciado_em, concluido_em, situacao, paginas_lidas, encontrados, aderentes, novos, atualizados, erro')
    .eq('org_id', orgId).order('iniciado_em', { ascending: false }).limit(limite)
  if (error) throw error
  return (data ?? []).map((l) => ({
    id: String(l.id),
    conector: String(l.conector),
    iniciadoEm: String(l.iniciado_em),
    concluidoEm: l.concluido_em ? String(l.concluido_em) : null,
    situacao: l.situacao as Rodada['situacao'],
    paginasLidas: Number(l.paginas_lidas ?? 0),
    encontrados: Number(l.encontrados ?? 0),
    aderentes: Number(l.aderentes ?? 0),
    novos: Number(l.novos ?? 0),
    atualizados: Number(l.atualizados ?? 0),
    erro: l.erro ? String(l.erro) : null,
  }))
}
