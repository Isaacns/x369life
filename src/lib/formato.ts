/* Formatação e cores. Valor sempre na moeda original (§33 do briefing). */
import type { Moeda, NivelRisco } from './tipos'

export function moeda(valor: number, m: Moeda = 'BRL', compacto = false): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: m,
    notation: compacto ? 'compact' : 'standard',
    maximumFractionDigits: compacto ? 1 : 0,
  }).format(valor)
}

/* ============================================================
   Somar carteira com moedas diferentes.

   Não existe conversão cambial no sistema, e inventar uma seria pior que não
   somar: cotação chutada num painel de conselho vira decisão. Então o total
   sai POR MOEDA — "R$ 83,1 mi + US$ 36,6 mi" — em vez de um número só com
   rótulo de real, que era o que acontecia e subestimava a carteira em ~2,6×.
   ============================================================ */
export interface TotalPorMoeda { moeda: Moeda; valor: number }

export function somarPorMoeda(itens: { valor: number; moeda: Moeda }[]): TotalPorMoeda[] {
  const mapa = new Map<Moeda, number>()
  for (const i of itens) mapa.set(i.moeda, (mapa.get(i.moeda) ?? 0) + i.valor)
  return [...mapa.entries()]
    .map(([moeda, valor]) => ({ moeda, valor }))
    .sort((a, b) => b.valor - a.valor)
}

/** Texto do total. Uma moeda → como sempre. Várias → somadas separadamente. */
export function totalCarteira(itens: { valor: number; moeda: Moeda }[], compacto = true): string {
  const t = somarPorMoeda(itens)
  if (t.length === 0) return moeda(0, 'BRL', compacto)
  return t.map((x) => moeda(x.valor, x.moeda, compacto)).join(' + ')
}

/** Para ordenar/comparar sem converter: só é comparável dentro da mesma moeda. */
export const moedaDominante = (itens: { valor: number; moeda: Moeda }[]): Moeda =>
  somarPorMoeda(itens)[0]?.moeda ?? 'BRL'

export function data(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

export function dataHora(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function pct(v: number, casas = 0): string {
  return `${v.toFixed(casas)}%`
}

export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?'
}

/* Semântica de cor do briefing §7: teal = positivo, âmbar = atenção,
   vermelho = risco. Nunca decorativo. */
export const corAderencia = (n: number) =>
  n >= 70 ? 'var(--teal)' : n >= 50 ? 'var(--amber)' : 'var(--danger)'

export const corRisco = (nivel: NivelRisco) =>
  nivel === 'baixo' ? 'var(--teal)' : nivel === 'moderado' ? 'var(--amber)'
    : nivel === 'alto' ? '#D97706' : 'var(--danger)'

export const corPrazo = (dias: number | null) =>
  dias === null ? 'var(--tx3)' :
  dias <= 0 ? 'var(--danger)' : dias <= 7 ? 'var(--danger)' : dias <= 20 ? 'var(--amber)' : 'var(--tx2)'

export const rotuloPrazo = (dias: number | null) =>
  dias === null ? 'sem prazo informado' :
  dias < 0 ? 'encerrado' : dias === 0 ? 'hoje' : dias === 1 ? '1 dia' : `${dias} dias`
