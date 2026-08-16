/* Formatação e cores. Valor sempre na moeda original (§33 do briefing). */
import type { Moeda, NivelRisco } from './tipos'

export function moeda(valor: number, m: Moeda = 'BRL', compacto = false): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: m,
    notation: compacto ? 'compact' : 'standard',
    maximumFractionDigits: compacto ? 1 : 0,
  }).format(valor)
}

export function data(iso: string): string {
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

export const corPrazo = (dias: number) =>
  dias <= 0 ? 'var(--danger)' : dias <= 7 ? 'var(--danger)' : dias <= 20 ? 'var(--amber)' : 'var(--tx2)'

export const rotuloPrazo = (dias: number) =>
  dias < 0 ? 'encerrado' : dias === 0 ? 'hoje' : dias === 1 ? '1 dia' : `${dias} dias`
