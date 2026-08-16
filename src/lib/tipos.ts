/* ============================================================
   X369life — modelo de domínio (espelha o schema do Supabase).
   Enquanto o backend não está provisionado, estes tipos são a
   fonte de verdade compartilhada entre modo demo e modo real.
   ============================================================ */

export type Moeda = 'BRL' | 'USD' | 'EUR' | 'GBP'

export type EtapaPipeline =
  | 'identificada' | 'triagem' | 'qualificada' | 'analise' | 'decisao'
  | 'proposta' | 'enviada' | 'julgamento' | 'vencida' | 'perdida' | 'descartada'

export const ETAPAS: { id: EtapaPipeline; label: string; prob: number }[] = [
  { id: 'identificada', label: 'Identificada',       prob: 0.05 },
  { id: 'triagem',      label: 'Em triagem',         prob: 0.10 },
  { id: 'qualificada',  label: 'Qualificada',        prob: 0.20 },
  { id: 'analise',      label: 'Em análise',         prob: 0.30 },
  { id: 'decisao',      label: 'Aguardando decisão', prob: 0.40 },
  { id: 'proposta',     label: 'Preparando proposta',prob: 0.50 },
  { id: 'enviada',      label: 'Proposta enviada',   prob: 0.60 },
  { id: 'julgamento',   label: 'Em julgamento',      prob: 0.70 },
  { id: 'vencida',      label: 'Vencida',            prob: 1.00 },
  { id: 'perdida',      label: 'Perdida',            prob: 0.00 },
  { id: 'descartada',   label: 'Descartada',         prob: 0.00 },
]

export type NivelRisco = 'baixo' | 'moderado' | 'alto' | 'critico'

export type Decisao =
  | 'participar' | 'nao_participar' | 'aguardar'
  | 'esclarecimento' | 'parceiro_local' | 'documentacao'

export interface Pais {
  id: string
  nome: string
  iso: string
  bandeira: string
  moeda: Moeda
  idioma: string
  exigeParceiroLocal: boolean
  participacaoEstrangeira: 'livre' | 'restrita' | 'vedada'
}

/** Componente da nota de aderência. `score: null` = DADO AUSENTE — nunca
 *  tratar ausência como atendimento integral (§16 do briefing). */
export interface ComponenteAderencia {
  id: string
  label: string
  peso: number
  score: number | null
  nota?: string
}

export interface ItemRisco {
  id: string
  categoria: string
  descricao: string
  probabilidade: 1 | 2 | 3 | 4 | 5
  impacto: 1 | 2 | 3 | 4 | 5
  evidencia: string
  mitigacao: string
  responsavel?: string
}

export interface Evidencia {
  documento: string
  pagina: number
  secao?: string
  trecho: string
  confianca: number      // 0..1
  revisadoPor?: string
  revisadoEm?: string
}

export interface CampoExtraido {
  campo: string
  valor: string
  evidencia: Evidencia
}

export interface DocumentoExigido {
  id: string
  nome: string
  categoria: string
  obrigatorio: boolean
  responsavel?: string
  prazo?: string
  status: 'nao_iniciado' | 'preparacao' | 'revisao' | 'concluido' | 'vencido' | 'nao_aplicavel'
  riscoInabilitacao: 'baixo' | 'medio' | 'alto'
  obs?: string
}

export interface Prazo { id: string; label: string; data: string }

export interface ItemSwot {
  id: string
  categoria: 'forca' | 'fraqueza' | 'oportunidade' | 'ameaca'
  descricao: string
  impacto: 1 | 2 | 3 | 4 | 5
  recomendacao?: string
  validado: boolean
}

export interface FatorPestel {
  id: string
  categoria: 'politico' | 'economico' | 'social' | 'tecnologico' | 'ambiental' | 'legal'
  descricao: string
  tendencia: 'melhora' | 'estavel' | 'piora'
  impacto: -3 | -2 | -1 | 0 | 1 | 2 | 3
  fonte: string
  incerteza: 'baixa' | 'media' | 'alta'
}

export interface Viabilidade {
  receita: number
  custos: number
  tributos: number
  logistica: number
  capitalGiro: number
  prazoRecebimentoDias: number
}

export interface Oportunidade {
  id: string
  titulo: string
  comprador: string
  paisId: string
  tipo: string
  produtos: string[]
  valor: number
  moeda: Moeda
  publicacao: string
  prazo: string                 // data-limite de envio da proposta
  fonte: string
  fonteUrl?: string
  financiamento: string
  exigeParceiroLocal: boolean
  etapa: EtapaPipeline
  responsavel: string
  decisao?: Decisao
  decisaoJustificativa?: string
  concorrentesEstimados: number | null
  componentesAderencia: ComponenteAderencia[]
  riscos: ItemRisco[]
  documentos: DocumentoExigido[]
  prazos: Prazo[]
  swot: ItemSwot[]
  pestel: FatorPestel[]
  viabilidade: Viabilidade | null
  camposExtraidos: CampoExtraido[]
  demo: boolean
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
  ultimoAcesso?: string
  fotoUrl?: string
  /** Flexão de gênero escolhida pela pessoa. Só afeta texto. */
  tratamento?: string
}

export interface PerfilOrganizacao {
  nome: string
  paisOrigem: string
  tipo: string
  paisesInteresse: string[]
  produtos: string[]
  certificacoes: string[]
  capacidadeMensal: string
  faixaMin: number
  faixaMax: number
  moeda: Moeda
  historicoPropostas: number
  historicoVitorias: number
}
