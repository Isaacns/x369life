import { PERFIS, type NavId, type Perfil } from '../app.config'

/* ============================================================
   Permissões por módulo — padrão do Inovar (perfil preenche, ajuste fino
   por pessoa), com uma trava a mais.

   O perfil define o TETO. O ajuste por pessoa só consegue tirar, nunca pôr.

   Isto agora é verdade nos dois lados. A migração `0010_leitura_por_perfil`
   levou a trava para o banco no que é sensível — viabilidade financeira,
   decisões registradas, riscos, SWOT, PESTEL e agenda passaram a exigir
   papel, não só pertencimento. Antes disso, um `fornecedor` recebia a margem
   de cada oportunidade no navegador mesmo com a tela fechada para ele.

   O que continua valendo só na tela é a restrição ABAIXO desse teto: se um
   administrador tira "Editar" de alguém que o perfil permitiria, a RLS ainda
   deixaria passar. Por isso o ajuste só restringe — liberar acima seria
   prometer um acesso que o servidor negaria.
   ============================================================ */

export interface Modulo { id: NavId; nome: string }

/** Módulos sujeitos a ajuste fino. `usuarios` e `config` ficam de fora:
    são administração, e administração é o próprio perfil que decide. */
export const MODULOS: Modulo[] = [
  { id: 'visao', nome: 'Visão geral' },
  { id: 'executivo', nome: 'Painel executivo' },
  { id: 'oportunidades', nome: 'Oportunidades e editais' },
  { id: 'pipeline', nome: 'Pipeline e decisões' },
  { id: 'agenda', nome: 'Agenda' },
  { id: 'relatorios', nome: 'Relatórios' },
  { id: 'inteligencia', nome: 'Inteligência' },
  { id: 'fontes', nome: 'Fontes' },
  { id: 'mercados', nome: 'Mercados e países' },
  { id: 'legislacao', nome: 'Legislação' },
  { id: 'produtos', nome: 'Produtos' },
  { id: 'comparador', nome: 'Comparador' },
]

export interface Acesso { v: boolean; e: boolean }
export type Permissoes = Partial<Record<string, Acesso>>

/** Teto de cada perfil: o que ele pode, no máximo, ver e editar. */
const TETO: Record<Perfil, Permissoes> = {
  owner: tudo(true),
  admin: tudo(true),
  comercial: {
    visao: { v: true, e: true }, executivo: { v: true, e: false },
    oportunidades: { v: true, e: true }, pipeline: { v: true, e: true },
    agenda: { v: true, e: true }, relatorios: { v: true, e: true },
    inteligencia: { v: true, e: false }, fontes: { v: true, e: false },
    mercados: { v: true, e: false }, legislacao: { v: true, e: false },
    produtos: { v: true, e: true }, comparador: { v: true, e: false },
  },
  tecnico: {
    visao: { v: true, e: false }, executivo: { v: false, e: false },
    oportunidades: { v: true, e: true }, pipeline: { v: true, e: false },
    agenda: { v: true, e: true }, relatorios: { v: true, e: false },
    inteligencia: { v: true, e: false }, fontes: { v: true, e: false },
    mercados: { v: true, e: false }, legislacao: { v: true, e: false },
    produtos: { v: true, e: true }, comparador: { v: true, e: false },
  },
  juridico: {
    visao: { v: true, e: false }, executivo: { v: false, e: false },
    oportunidades: { v: true, e: true }, pipeline: { v: true, e: false },
    agenda: { v: true, e: true }, relatorios: { v: true, e: false },
    inteligencia: { v: true, e: false }, fontes: { v: true, e: false },
    mercados: { v: true, e: false }, legislacao: { v: true, e: false },
    produtos: { v: true, e: false }, comparador: { v: true, e: false },
  },
  fornecedor: {
    visao: { v: false, e: false }, executivo: { v: false, e: false },
    oportunidades: { v: true, e: false }, pipeline: { v: false, e: false },
    agenda: { v: false, e: false }, relatorios: { v: false, e: false },
    inteligencia: { v: false, e: false }, fontes: { v: false, e: false },
    mercados: { v: false, e: false }, legislacao: { v: false, e: false },
    produtos: { v: true, e: false }, comparador: { v: false, e: false },
  },
  visualizador: {
    visao: { v: true, e: false }, executivo: { v: true, e: false },
    oportunidades: { v: true, e: false }, pipeline: { v: true, e: false },
    agenda: { v: true, e: false }, relatorios: { v: true, e: false },
    inteligencia: { v: true, e: false }, fontes: { v: true, e: false },
    mercados: { v: true, e: false }, legislacao: { v: true, e: false },
    produtos: { v: true, e: false }, comparador: { v: true, e: false },
  },
}

function tudo(valor: boolean): Permissoes {
  return Object.fromEntries(MODULOS.map((m) => [m.id, { v: valor, e: valor }]))
}

export const tetoDoPerfil = (p: Perfil): Permissoes => TETO[p] ?? TETO.visualizador

/** Acesso final: teto do perfil ∩ ajuste da pessoa. */
export function acesso(perfil: Perfil, ajuste: Permissoes | null | undefined, modulo: string): Acesso {
  const teto = tetoDoPerfil(perfil)[modulo] ?? { v: false, e: false }
  if (!ajuste || !ajuste[modulo]) return teto
  const a = ajuste[modulo]
  return { v: teto.v && a.v !== false, e: teto.e && a.e !== false }
}

export const podeVerModulo = (perfil: Perfil, aj: Permissoes | null | undefined, m: string) =>
  acesso(perfil, aj, m).v
export const podeEditarModulo = (perfil: Perfil, aj: Permissoes | null | undefined, m: string) =>
  acesso(perfil, aj, m).e

/** Perfis com acesso total não têm matriz: o teto já é tudo. */
export const acessoTotal = (p: Perfil) => (PERFIS[p]?.nivel ?? 0) >= 90
