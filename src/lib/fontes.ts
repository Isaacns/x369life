/* ============================================================
   Catálogo de fontes — a base da coleta automática.
   Cada portal é um CONECTOR próprio: formato, idioma, cadência e
   regra de uso diferentes. Não existe API única mundial de editais.

   Regra desta tela: o estado de cada fonte é declarado com honestidade.
   · 'disponivel'  → API pública de leitura confirmada nesta data
   · 'a_validar'   → fonte real do setor, endpoint ainda não verificado
   · 'sem_api'     → só existe portal web; exige coleta assistida
   Nenhuma fonte aparece como "conectada" enquanto não estiver coletando.
   ============================================================ */

export type EstadoFonte = 'coletando' | 'disponivel' | 'a_validar' | 'sem_api'

export interface Fonte {
  id: string
  nome: string
  organizacao: string
  abrangencia: string
  paisId?: string
  tipo: 'portal_oficial' | 'banco_multilateral' | 'organismo_internacional' | 'agregador'
  /** Hierarquia de confiabilidade do briefing §29: 1 = topo. */
  prioridade: number
  estado: EstadoFonte
  autenticacao: 'nenhuma' | 'registro' | 'chave' | 'a_verificar'
  cadenciaSugerida: string
  url: string
  nota?: string
  ultimaSincronizacao?: string
}

export const FONTES: Fonte[] = [
  {
    id: 'pncp',
    nome: 'PNCP — Portal Nacional de Contratações Públicas',
    organizacao: 'Governo Federal · Brasil',
    abrangencia: 'Brasil — União, estados e municípios',
    paisId: 'br',
    tipo: 'portal_oficial',
    prioridade: 1,
    estado: 'disponivel',
    autenticacao: 'nenhuma',
    cadenciaSugerida: 'a cada 30 min',
    url: 'https://pncp.gov.br/api/consulta/swagger-ui/index.html',
    nota: 'API REST de consulta pública, JSON, sem autenticação para leitura. É a fonte mais completa do mercado brasileiro desde a Lei 14.133.',
  },
  {
    id: 'ted',
    nome: 'TED — Tenders Electronic Daily',
    organizacao: 'União Europeia',
    abrangencia: '27 países da UE + EEE',
    paisId: 'pt',
    tipo: 'portal_oficial',
    prioridade: 1,
    estado: 'disponivel',
    autenticacao: 'nenhuma',
    cadenciaSugerida: 'a cada 1 h',
    url: 'https://docs.ted.europa.eu/api/latest/search.html',
    nota: 'Search API voltada a reúso de dados, sem autenticação. Cobre Portugal e todo o mercado europeu de contratação pública acima dos limiares comunitários.',
  },
  {
    id: 'ungm',
    nome: 'UNGM — United Nations Global Marketplace',
    organizacao: 'Organização das Nações Unidas',
    abrangencia: 'Global — agências da ONU',
    tipo: 'organismo_internacional',
    prioridade: 4,
    estado: 'a_validar',
    autenticacao: 'a_verificar',
    cadenciaSugerida: 'a cada 4 h',
    url: 'https://www.ungm.org',
    nota: 'Aquisições das agências da ONU. Exige verificar o caminho de acesso programático e as condições de uso antes de conectar.',
  },
  {
    id: 'worldbank',
    nome: 'Avisos de aquisição do Banco Mundial',
    organizacao: 'World Bank Group',
    abrangencia: 'Global — projetos financiados',
    tipo: 'banco_multilateral',
    prioridade: 3,
    estado: 'a_validar',
    autenticacao: 'a_verificar',
    cadenciaSugerida: 'a cada 6 h',
    url: 'https://projects.worldbank.org',
    nota: 'Projeto financiado por banco multilateral tem regra de elegibilidade própria e costuma admitir participação estrangeira — é o filão de maior valor para exportador.',
  },
  {
    id: 'bid',
    nome: 'Avisos de aquisição do BID',
    organizacao: 'Banco Interamericano de Desenvolvimento',
    abrangencia: 'América Latina e Caribe',
    tipo: 'banco_multilateral',
    prioridade: 3,
    estado: 'a_validar',
    autenticacao: 'a_verificar',
    cadenciaSugerida: 'a cada 6 h',
    url: 'https://www.iadb.org/en/procurement',
    nota: 'Mesma lógica do Banco Mundial, com foco na região onde o produto tem vantagem logística.',
  },
  {
    id: 'mercadopublico',
    nome: 'Mercado Público',
    organizacao: 'ChileCompra · Chile',
    abrangencia: 'Chile',
    paisId: 'cl',
    tipo: 'portal_oficial',
    prioridade: 1,
    estado: 'a_validar',
    autenticacao: 'a_verificar',
    cadenciaSugerida: 'a cada 2 h',
    url: 'https://www.mercadopublico.cl',
    nota: 'Portal central de compras públicas do Chile. Historicamente oferece acesso programático mediante registro.',
  },
  {
    id: 'secop',
    nome: 'SECOP II · Datos Abiertos',
    organizacao: 'Colombia Compra Eficiente',
    abrangencia: 'Colômbia',
    paisId: 'co',
    tipo: 'portal_oficial',
    prioridade: 1,
    estado: 'a_validar',
    autenticacao: 'a_verificar',
    cadenciaSugerida: 'a cada 2 h',
    url: 'https://www.colombiacompra.gov.co',
    nota: 'Colômbia publica contratação pública em portal de dados abertos — em geral o caminho mais direto de toda a região.',
  },
  {
    id: 'compranet',
    nome: 'CompraNet',
    organizacao: 'Governo Federal · México',
    abrangencia: 'México',
    paisId: 'mx',
    tipo: 'portal_oficial',
    prioridade: 1,
    estado: 'a_validar',
    autenticacao: 'a_verificar',
    cadenciaSugerida: 'a cada 4 h',
    url: 'https://compranet.hacienda.gob.mx',
    nota: 'Sistema federal mexicano. Verificar disponibilidade de API e cobertura estadual antes de prometer alcance.',
  },
  {
    id: 'base-pt',
    nome: 'BASE — Contratos Públicos Online',
    organizacao: 'IMPIC · Portugal',
    abrangencia: 'Portugal',
    paisId: 'pt',
    tipo: 'portal_oficial',
    prioridade: 1,
    estado: 'a_validar',
    autenticacao: 'a_verificar',
    cadenciaSugerida: 'a cada 4 h',
    url: 'https://www.base.gov.pt',
    nota: 'Complementa o TED com os procedimentos portugueses abaixo dos limiares comunitários.',
  },
  {
    id: 'diarios',
    nome: 'Diários oficiais e portais municipais',
    organizacao: 'Diversos',
    abrangencia: 'Municipal — onde não há portal central',
    tipo: 'agregador',
    prioridade: 2,
    estado: 'sem_api',
    autenticacao: 'nenhuma',
    cadenciaSugerida: 'diária',
    url: '',
    nota: 'Boa parte da iluminação pública é contratada por município pequeno, fora de portal central. Aqui a coleta é assistida: o sistema monitora a publicação e a pessoa confirma — nunca raspagem silenciosa de portal que não autoriza.',
  },
]

export const ROTULO_ESTADO: Record<EstadoFonte, { label: string; cor: string; explica: string }> = {
  coletando:  { label: 'Coletando',     cor: 'var(--teal)',  explica: 'Conector ativo, sincronizando na cadência definida.' },
  disponivel: { label: 'Pronta',        cor: 'var(--info)',  explica: 'API pública de leitura confirmada. Conecta assim que o backend existir.' },
  a_validar:  { label: 'A validar',     cor: 'var(--amber)', explica: 'Fonte real do setor; falta confirmar endpoint e condições de uso.' },
  sem_api:    { label: 'Coleta assistida', cor: 'var(--tx3)', explica: 'Sem API. Monitoramento com confirmação humana antes de entrar na base.' },
}

export const ROTULO_TIPO: Record<Fonte['tipo'], string> = {
  portal_oficial: 'Portal oficial',
  banco_multilateral: 'Banco multilateral',
  organismo_internacional: 'Organismo internacional',
  agregador: 'Agregador / diário oficial',
}
