/* ============================================================
   X369life — configuração central do produto.
   O briefing exige que o nome fique num arquivo só, para trocar
   sem caçar string no código. Tudo que é identidade mora aqui.
   ============================================================ */

export const APP = {
  nome: 'X369life',
  marca: 'X369',
  sufixo: 'life',
  subtitulo:
    'Inteligência de mercado, editais e negócios para iluminação pública e cidades inteligentes.',
  chamadaLogin: 'Decisão de licitação com evidência, não com achismo.',
  rodape: 'INPERSON · VIZIO',
  versao: (window as unknown as { APP_VERSION?: string }).APP_VERSION ?? '0.1.0',
} as const

/* ---- Aviso legal permanente (§24 do briefing) ---- */
export const AVISO_LEGAL =
  'As informações disponibilizadas não substituem orientação jurídica, fiscal, técnica ou regulatória especializada.'

export const AVISO_DEMO =
  'Dados demonstrativos. Não utilizar para tomada de decisão real.'

/* ---- Modo de operação ----
   Sem VITE_SUPABASE_URL o app roda em MODO DEMONSTRATIVO, com dados locais
   marcados na tela. Assim que o projeto Supabase for provisionado e as
   variáveis existirem, o app passa a usar o backend real automaticamente.
   Nunca simular backend como se fosse real (§13 e §36 do briefing).        */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
export const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
export const MODO_DEMO = !SUPABASE_URL || !SUPABASE_ANON

/* ---- IA (Claude) — DORMENTE por decisão do Isaac (16/08/2026) ----
   A interface de serviço existe e está desligada. Sem chave configurada a UI
   diz "IA não configurada" e oferece preenchimento manual — não simula análise. */
export const IA = {
  ativa: (import.meta.env.VITE_IA_ATIVA as string | undefined) === 'true',
  provedor: 'anthropic' as const,
  modelo: 'claude-opus-5',
  /* A chave NUNCA vive no navegador (§31). A chamada sai por Edge Function
     (`analisar-documento`), que lê ANTHROPIC_API_KEY do ambiente do Supabase. */
  endpoint: 'analisar-documento',
} as const

/* ---- Navegação principal (§8 do briefing) ---- */
export type NavId =
  | 'visao' | 'executivo' | 'oportunidades' | 'pipeline' | 'relatorios'
  | 'inteligencia' | 'fontes' | 'mercados' | 'legislacao'
  | 'produtos' | 'comparador'
  | 'organizacoes' | 'usuarios' | 'config'

export interface NavItem { id: NavId; icone: string; label: string; grupo: string; pronto: boolean }

export const NAV: NavItem[] = [
  { id: 'visao',         icone: '◈', label: 'Visão geral',       grupo: 'Decisão',    pronto: true },
  { id: 'executivo',     icone: '▲', label: 'Painel executivo',  grupo: 'Decisão',    pronto: true },
  { id: 'oportunidades', icone: '◎', label: 'Oportunidades',     grupo: 'Decisão',    pronto: true },
  { id: 'pipeline',      icone: '▤', label: 'Pipeline',          grupo: 'Decisão',    pronto: true },
  { id: 'relatorios',    icone: '▦', label: 'Relatórios',        grupo: 'Decisão',    pronto: true },
  { id: 'inteligencia',  icone: '◇', label: 'Inteligência',      grupo: 'Inteligência', pronto: true },
  { id: 'fontes',        icone: '⌖', label: 'Fontes',            grupo: 'Inteligência', pronto: true },
  { id: 'mercados',      icone: '◐', label: 'Mercados e países', grupo: 'Inteligência', pronto: false },
  { id: 'legislacao',    icone: '§', label: 'Legislação',        grupo: 'Inteligência', pronto: false },
  { id: 'produtos',      icone: '◍', label: 'Produtos',          grupo: 'Catálogo',   pronto: false },
  { id: 'comparador',    icone: '⇄', label: 'Comparador',        grupo: 'Catálogo',   pronto: false },
  { id: 'organizacoes',  icone: '◫', label: 'Organizações',      grupo: 'Administração', pronto: false },
  { id: 'usuarios',      icone: '◉', label: 'Usuários',          grupo: 'Administração', pronto: true },
  { id: 'config',        icone: '⚙', label: 'Configurações',     grupo: 'Administração', pronto: true },
]

/* ---- Perfis / RBAC (§4 do briefing + §8 dos padrões VIZIO) ---- */
export const PERFIS = {
  owner:        { label: 'Proprietário',      nivel: 100 },
  admin:        { label: 'Administrador',     nivel: 90 },
  comercial:    { label: 'Gestor comercial',  nivel: 60 },
  tecnico:      { label: 'Analista técnico',  nivel: 50 },
  juridico:     { label: 'Analista jurídico', nivel: 50 },
  fornecedor:   { label: 'Fornecedor',        nivel: 30 },
  visualizador: { label: 'Visualizador',      nivel: 10 },
} as const

export type Perfil = keyof typeof PERFIS
export const PERFIS_LISTA = Object.keys(PERFIS) as Perfil[]
export const podeAdministrar = (p: Perfil | null) => !!p && PERFIS[p].nivel >= 90
export const podeEditar = (p: Perfil | null) => !!p && PERFIS[p].nivel >= 50
