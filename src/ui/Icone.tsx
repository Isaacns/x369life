import type { NavId } from '../app.config'

/* ============================================================
   Ícones do X369life.

   Substituem os glifos Unicode (◈ ▲ ◎ ▤ …) que faziam papel de ícone. Glifo
   não é sistema de ícones: cada fonte desenha o seu do seu jeito, o peso não
   combina com o resto, e no Android metade cai em fallback. Aqui é traço
   autoral, todos na mesma grade de 24 e no mesmo peso de 1.6.

   O vocabulário é o do produto — ponto de luz, documento, funil, calendário —
   e não o genérico de biblioteca.
   ============================================================ */

const D: Record<string, string> = {
  // Visão geral — o painel de leitura
  visao: 'M4 13h6v7H4zM4 4h6v6H4zM14 4h6v11h-6zM14 18h6v2h-6z',
  // Painel executivo — a curva que sobe
  executivo: 'M4 18l5-6 4 3 6-8M15 7h4v4',
  // Oportunidades — o edital
  oportunidades: 'M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h5',
  // Pipeline — as raias
  pipeline: 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v5h-4z',
  // Agenda — o calendário
  agenda: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4M8 14h3',
  // Relatórios — a folha impressa
  relatorios: 'M7 3h10v18H7zM10 8h4M10 12h4M10 16h2',
  // Inteligência — o cruzamento de sinais
  inteligencia: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5L15 9M9 15l-2.5 2.5M12 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  // Fontes — o alvo de coleta
  fontes: 'M12 4v3M12 17v3M4 12h3M17 12h3M12 8a4 4 0 100 8 4 4 0 000-8z',
  // Mercados e países — o globo
  mercados: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.4 3.8 5.5 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3z',
  // Legislação — a balança
  legislacao: 'M12 4v16M7 20h10M5 8h14M5 8l-2 5h4zM19 8l-2 5h4zM12 4l-4 4M12 4l4 4',
  // Produtos — a luminária
  produtos: 'M12 3v3M7 9h10l2 5H5zM9 14v3a3 3 0 006 0v-3',
  // Comparador — as duas vias
  comparador: 'M8 5l-4 4 4 4M4 9h13M16 19l4-4-4-4M20 15H7',
  // Organizações — o prédio
  organizacoes: 'M5 21V6l7-3 7 3v15M9 21v-4h6v4M9 9h2M13 9h2M9 13h2M13 13h2',
  // Usuários — as pessoas
  usuarios: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5.2a3.5 3.5 0 010 6.6M18 14.7c2 .7 3.4 2.4 3.4 5.3',
  // Configurações — o ajuste
  config: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2v.2a2 2 0 11-4 0v-.1a1.7 1.7 0 00-3-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003.4 15H3a2 2 0 110-4h.2a1.7 1.7 0 001.1-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 009 4.6V4a2 2 0 114 0v.2a1.7 1.7 0 002.9 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.9h.2a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1z',

  // fora da navegação
  mais: 'M4 7h16M4 12h16M4 17h16',
  sair: 'M15 17l5-5-5-5M20 12H9M11 4H5v16h6',
  tema: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 3v18',
  fechar: 'M6 6l12 12M18 6L6 18',
  voltar: 'M15 5l-7 7 7 7',
}

export type IconeId = keyof typeof D | NavId

export function Icone({ id, tamanho = 20, className }:
{ id: string; tamanho?: number; className?: string }) {
  const caminho = D[id]
  if (!caminho) return null
  return (
    <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <path d={caminho} />
    </svg>
  )
}
