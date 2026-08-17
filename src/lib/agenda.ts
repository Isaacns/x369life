import { sb } from './supabase'

/* ============================================================
   Agenda — acesso a dados.
   Fica fora de `dados.tsx` de propósito: a agenda é carregada por semana,
   não junto com o resto do sistema. Puxar a agenda inteira em toda abertura
   do painel seria peso sem uso.
   ============================================================ */

export type Periodo = 'manha' | 'tarde' | 'noite'
export type StatusAgenda = 'pendente' | 'andamento' | 'concluida'

export interface Compromisso {
  id: string
  data: string           // AAAA-MM-DD
  periodo: Periodo
  hora: string | null
  titulo: string
  detalhe: string | null
  status: StatusAgenda
  responsavelId: string | null
  responsavelNome: string | null
  oportunidadeId: string | null
  oportunidadeTitulo: string | null
}

export const PERIODOS: { id: Periodo; nome: string; ico: string }[] = [
  { id: 'manha', nome: 'Manhã', ico: '🌅' },
  { id: 'tarde', nome: 'Tarde', ico: '☀️' },
  { id: 'noite', nome: 'Noite', ico: '🌙' },
]

export const STATUS: Record<StatusAgenda, { label: string; cor: string }> = {
  pendente: { label: 'Pendente', cor: 'var(--amber)' },
  andamento: { label: 'Em andamento', cor: 'var(--info)' },
  concluida: { label: 'Concluída', cor: 'var(--teal)' },
}

/** Horário sugerido quando o compromisso muda de período no arrasto. */
export const horaPadrao = (p: Periodo) =>
  p === 'manha' ? '09h - 10h' : p === 'tarde' ? '14h - 15h' : '19h - 20h'

/** Deduz o período a partir do texto livre de horário. */
export function periodoDe(hora: string | null): Periodo {
  const m = (hora ?? '').match(/(\d{1,2})/)
  if (!m) return 'manha'
  const h = Number(m[1])
  return h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite'
}

export function periodoAgora(agora = new Date()): Periodo {
  const h = agora.getHours()
  return h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite'
}

/* ---------- datas (locais, sem UTC no meio) ---------- */

export function segundaDe(d: Date): Date {
  const x = new Date(d)
  const dia = x.getDay()
  x.setDate(x.getDate() + (dia === 0 ? -6 : 1 - dia))
  x.setHours(0, 0, 0, 0)
  return x
}
export function somaDias(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
/** ISO local — `toISOString()` converteria para UTC e trocaria o dia à noite. */
export function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const diaMes = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

export const NOMES_DIA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

/* ---------- consultas ---------- */

const SELECT = `
  id, data, periodo, hora, titulo, detalhe, status,
  responsavel_id, opportunity_id,
  responsavel:profiles!agenda_eventos_responsavel_id_fkey(nome),
  oportunidade:opportunities(titulo)
`

type Linha = Record<string, unknown>
const um = <T,>(v: unknown): T | null =>
  (Array.isArray(v) ? (v[0] as T | undefined) ?? null : (v as T | null))

function paraCompromisso(l: Linha): Compromisso {
  const resp = um<{ nome: string | null }>(l.responsavel)
  const op = um<{ titulo: string | null }>(l.oportunidade)
  return {
    id: String(l.id),
    data: String(l.data),
    periodo: (l.periodo as Periodo) ?? 'manha',
    hora: (l.hora as string | null) ?? null,
    titulo: String(l.titulo ?? ''),
    detalhe: (l.detalhe as string | null) ?? null,
    status: (l.status as StatusAgenda) ?? 'pendente',
    responsavelId: (l.responsavel_id as string | null) ?? null,
    responsavelNome: resp?.nome ?? null,
    oportunidadeId: (l.opportunity_id as string | null) ?? null,
    oportunidadeTitulo: op?.titulo ?? null,
  }
}

export async function listarSemana(orgId: string, de: string, ate: string): Promise<Compromisso[]> {
  if (!sb) return []
  const { data, error } = await sb.schema('x369life').from('agenda_eventos')
    .select(SELECT)
    .eq('org_id', orgId).is('excluido_em', null)
    .gte('data', de).lte('data', ate)
    .order('data').order('hora', { nullsFirst: true })
  if (error) throw error
  return (data ?? []).map((l) => paraCompromisso(l as Linha))
}

export interface NovoCompromisso {
  data: string; periodo: Periodo; hora: string | null
  titulo: string; detalhe: string | null; status: StatusAgenda
  responsavelId: string | null; oportunidadeId: string | null
}

export async function criar(orgId: string, autorId: string, c: NovoCompromisso) {
  if (!sb) throw new Error('Backend não configurado.')
  const { error } = await sb.schema('x369life').from('agenda_eventos').insert({
    org_id: orgId, criado_por: autorId,
    data: c.data, periodo: c.periodo, hora: c.hora, titulo: c.titulo,
    detalhe: c.detalhe, status: c.status,
    responsavel_id: c.responsavelId, opportunity_id: c.oportunidadeId,
  })
  if (error) throw error
}

export async function atualizar(id: string, patch: Partial<NovoCompromisso>) {
  if (!sb) throw new Error('Backend não configurado.')
  const linha: Record<string, unknown> = {}
  if (patch.data !== undefined) linha.data = patch.data
  if (patch.periodo !== undefined) linha.periodo = patch.periodo
  if (patch.hora !== undefined) linha.hora = patch.hora
  if (patch.titulo !== undefined) linha.titulo = patch.titulo
  if (patch.detalhe !== undefined) linha.detalhe = patch.detalhe
  if (patch.status !== undefined) linha.status = patch.status
  if (patch.responsavelId !== undefined) linha.responsavel_id = patch.responsavelId
  if (patch.oportunidadeId !== undefined) linha.opportunity_id = patch.oportunidadeId
  const { error } = await sb.schema('x369life').from('agenda_eventos').update(linha).eq('id', id)
  if (error) throw error
}

/** Nada é apagado: sai de circulação com data de exclusão. */
export async function arquivar(id: string) {
  if (!sb) throw new Error('Backend não configurado.')
  const { error } = await sb.schema('x369life').from('agenda_eventos')
    .update({ excluido_em: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/* ---------- trilha de alterações ---------- */

export interface LinhaTrilha {
  id: number; operacao: string; criadoEm: string
  titulo: string | null; antes: string | null
}

export async function trilha(orgId: string, limite = 60): Promise<LinhaTrilha[]> {
  if (!sb) return []
  const { data, error } = await sb.schema('x369life').from('audit_log')
    .select('id, operacao, criado_em, valor_anterior, valor_novo')
    .eq('org_id', orgId).eq('tabela', 'agenda_eventos')
    .order('criado_em', { ascending: false }).limit(limite)
  if (error) throw error
  return (data ?? []).map((l) => {
    const novo = l.valor_novo as { titulo?: string; data?: string; hora?: string } | null
    const velho = l.valor_anterior as { titulo?: string; data?: string; hora?: string } | null
    return {
      id: Number(l.id),
      operacao: String(l.operacao),
      criadoEm: String(l.criado_em),
      titulo: novo?.titulo ?? velho?.titulo ?? null,
      antes: velho ? `${velho.data ?? ''} ${velho.hora ?? ''} · ${velho.titulo ?? ''}`.trim() : null,
    }
  })
}
