/* ============================================================
   Dados demonstrativos (§35 do briefing).
   Compradores, órgãos e fornecedores são FICTÍCIOS de propósito —
   nenhuma autoridade ou empresa real aparece de forma que sugira
   vínculo, contratação ou aprovação. Países e moedas são reais
   porque são fato geográfico, não endosso.
   Tudo daqui carrega `demo: true` e a tela avisa.
   ============================================================ */

import type {
  ComponenteAderencia, Oportunidade, Pais, PerfilOrganizacao, Usuario,
} from './tipos'
import { PESOS_ADERENCIA_PADRAO, ROTULOS_ADERENCIA } from './scoring'

export const PAISES: Pais[] = [
  { id: 'br', nome: 'Brasil',   iso: 'BRA', bandeira: '🇧🇷', moeda: 'BRL', idioma: 'Português', exigeParceiroLocal: false, participacaoEstrangeira: 'livre' },
  { id: 'cl', nome: 'Chile',    iso: 'CHL', bandeira: '🇨🇱', moeda: 'USD', idioma: 'Espanhol',  exigeParceiroLocal: false, participacaoEstrangeira: 'livre' },
  { id: 'co', nome: 'Colômbia', iso: 'COL', bandeira: '🇨🇴', moeda: 'USD', idioma: 'Espanhol',  exigeParceiroLocal: true,  participacaoEstrangeira: 'restrita' },
  { id: 'pt', nome: 'Portugal', iso: 'PRT', bandeira: '🇵🇹', moeda: 'EUR', idioma: 'Português', exigeParceiroLocal: false, participacaoEstrangeira: 'livre' },
  { id: 'mx', nome: 'México',   iso: 'MEX', bandeira: '🇲🇽', moeda: 'USD', idioma: 'Espanhol',  exigeParceiroLocal: true,  participacaoEstrangeira: 'restrita' },
]

export const paisPorId = (id: string) => PAISES.find((p) => p.id === id) ?? PAISES[0]

/** Monta os 9 componentes da aderência. `null` = dado ausente (§16). */
function comps(v: Partial<Record<string, number | null>>): ComponenteAderencia[] {
  return Object.keys(PESOS_ADERENCIA_PADRAO).map((id) => ({
    id,
    label: ROTULOS_ADERENCIA[id],
    peso: PESOS_ADERENCIA_PADRAO[id],
    score: id in v ? (v[id] as number | null) : null,
  }))
}

const hoje = new Date()
const emDias = (d: number) => {
  const x = new Date(hoje)
  x.setDate(x.getDate() + d)
  return x.toISOString().slice(0, 10)
}

export const PERFIL_DEMO: PerfilOrganizacao = {
  nome: 'Luminatta Indústria de Iluminação (demonstração)',
  paisOrigem: 'br',
  tipo: 'Fabricante e integrador',
  paisesInteresse: ['br', 'cl', 'co', 'pt', 'mx'],
  produtos: ['Luminárias LED', 'Telegestão', 'Sensores e IoT', 'Projetos luminotécnicos'],
  certificacoes: ['INMETRO', 'IEC 60598', 'ISO 9001', 'ENEC'],
  capacidadeMensal: '12.000 luminárias/mês',
  faixaMin: 500_000,
  faixaMax: 80_000_000,
  moeda: 'BRL',
  historicoPropostas: 14,
  historicoVitorias: 4,
}

export const USUARIOS_DEMO: Usuario[] = [
  { id: 'u1', nome: 'Isaac Nogueira',   email: 'isaac@x369life.demo',   perfil: 'owner',        ativo: true, ultimoAcesso: new Date().toISOString() },
  { id: 'u2', nome: 'Marina Alencar',   email: 'marina@x369life.demo',  perfil: 'comercial',    ativo: true, ultimoAcesso: emDias(-1) + 'T14:20:00' },
  { id: 'u3', nome: 'Rafael Nogueira',  email: 'rafael@x369life.demo',  perfil: 'tecnico',      ativo: true, ultimoAcesso: emDias(-2) + 'T09:05:00' },
  { id: 'u4', nome: 'Carla Menezes',    email: 'carla@x369life.demo',   perfil: 'juridico',     ativo: true, ultimoAcesso: emDias(-5) + 'T17:40:00' },
  { id: 'u5', nome: 'Diego Fontes',     email: 'diego@x369life.demo',   perfil: 'visualizador', ativo: false },
]

/* ---------------- edital completo de demonstração (§35) ---------------- */

const EDITAL_COMPLETO: Oportunidade = {
  id: 'op-01',
  titulo: 'Modernização de 42.000 pontos de iluminação pública com telegestão',
  comprador: 'Consórcio Intermunicipal da Região de Vale Sereno (fictício)',
  paisId: 'br',
  tipo: 'Concorrência internacional',
  produtos: ['Luminárias LED', 'Telegestão', 'Serviços de engenharia'],
  valor: 68_400_000,
  moeda: 'BRL',
  publicacao: emDias(-18),
  prazo: emDias(24),
  fonte: 'Portal oficial do consórcio',
  fonteUrl: 'https://exemplo.demo/edital-042',
  financiamento: 'Banco multilateral de desenvolvimento',
  exigeParceiroLocal: false,
  etapa: 'analise',
  responsavel: 'Marina Alencar',
  concorrentesEstimados: 6,
  demo: true,
  componentesAderencia: comps({
    produtos: 92, certificacoes: 78, tecnica: 85, experiencia: 70,
    financeira: 65, logistica: 80, juridica: 100, prazo: 60, local: 55,
  }),
  riscos: [
    { id: 'r1', categoria: 'Documental', descricao: 'Atestado de capacidade técnica exige obra equivalente com telegestão em operação há 12 meses', probabilidade: 4, impacto: 5, evidencia: 'Edital, item 9.4.2, p. 31', mitigacao: 'Obter declaração do contratante da obra de Ribeira Alta, concluída há 14 meses', responsavel: 'Carla Menezes' },
    { id: 'r2', categoria: 'Financeiro', descricao: 'Garantia de proposta de 1% do valor estimado, em até 5 dias úteis', probabilidade: 3, impacto: 4, evidencia: 'Edital, item 11.1, p. 38', mitigacao: 'Acionar seguradora com apólice pré-aprovada', responsavel: 'Financeiro' },
    { id: 'r3', categoria: 'Cambial', descricao: 'Preço fixo em BRL com 30% de componentes importados e sem cláusula de reajuste cambial', probabilidade: 4, impacto: 4, evidencia: 'Edital, item 14.3, p. 47', mitigacao: 'Travar câmbio na proposta (NDF) e precificar hedge no custo' },
    { id: 'r4', categoria: 'Técnico', descricao: 'Protocolo de telegestão especificado como proprietário, sem menção a interoperabilidade', probabilidade: 3, impacto: 3, evidencia: 'Anexo II — Especificações, item 4.7, p. 12', mitigacao: 'Pedir esclarecimento formal sobre aceite de protocolo aberto equivalente' },
    { id: 'r5', categoria: 'Prazo', descricao: 'Entrega de 42.000 pontos em 10 meses exige 4.200 luminárias/mês', probabilidade: 2, impacto: 4, evidencia: 'Edital, cronograma, p. 52', mitigacao: 'Capacidade instalada é de 12.000/mês — folga confortável' },
    { id: 'r6', categoria: 'Logístico', descricao: 'Entrega em 11 municípios com 3 centros de distribuição definidos pelo comprador', probabilidade: 2, impacto: 2, evidencia: 'Anexo IV, p. 8', mitigacao: 'Operador logístico já atende a região' },
  ],
  documentos: [
    { id: 'd1', nome: 'Certidão negativa de débitos federais', categoria: 'Fiscal', obrigatorio: true, responsavel: 'Carla Menezes', prazo: emDias(10), status: 'concluido', riscoInabilitacao: 'alto' },
    { id: 'd2', nome: 'Atestado de capacidade técnica com telegestão', categoria: 'Técnico', obrigatorio: true, responsavel: 'Rafael Nogueira', prazo: emDias(12), status: 'revisao', riscoInabilitacao: 'alto', obs: 'Vinculado ao risco R1' },
    { id: 'd3', nome: 'Balanço patrimonial dos 2 últimos exercícios', categoria: 'Econômico-financeiro', obrigatorio: true, responsavel: 'Financeiro', prazo: emDias(8), status: 'preparacao', riscoInabilitacao: 'alto' },
    { id: 'd4', nome: 'Garantia de proposta (1%)', categoria: 'Garantias', obrigatorio: true, responsavel: 'Financeiro', prazo: emDias(20), status: 'nao_iniciado', riscoInabilitacao: 'alto', obs: 'Vinculado ao risco R2' },
    { id: 'd5', nome: 'Certificado INMETRO das luminárias ofertadas', categoria: 'Certificações', obrigatorio: true, responsavel: 'Rafael Nogueira', prazo: emDias(14), status: 'concluido', riscoInabilitacao: 'alto' },
    { id: 'd6', nome: 'Ensaio fotométrico LM-79 por laboratório acreditado', categoria: 'Técnico', obrigatorio: true, responsavel: 'Rafael Nogueira', prazo: emDias(15), status: 'preparacao', riscoInabilitacao: 'medio' },
    { id: 'd7', nome: 'Declaração de visita técnica', categoria: 'Técnico', obrigatorio: false, responsavel: 'Marina Alencar', prazo: emDias(6), status: 'nao_iniciado', riscoInabilitacao: 'baixo' },
    { id: 'd8', nome: 'Amostra de luminária para ensaio de recebimento', categoria: 'Amostras', obrigatorio: true, responsavel: 'Produção', prazo: emDias(18), status: 'nao_iniciado', riscoInabilitacao: 'medio' },
  ],
  prazos: [
    { id: 'p1', label: 'Publicação',            data: emDias(-18) },
    { id: 'p2', label: 'Pedido de esclarecimento', data: emDias(9) },
    { id: 'p3', label: 'Visita técnica',        data: emDias(6) },
    { id: 'p4', label: 'Envio da proposta',     data: emDias(24) },
    { id: 'p5', label: 'Abertura',              data: emDias(27) },
    { id: 'p6', label: 'Julgamento',            data: emDias(45) },
    { id: 'p7', label: 'Contratação',           data: emDias(75) },
    { id: 'p8', label: 'Início da entrega',     data: emDias(110) },
  ],
  swot: [
    { id: 's1', categoria: 'forca',       descricao: 'Capacidade instalada 3x superior à exigida pelo cronograma', impacto: 4, recomendacao: 'Usar como diferencial na proposta técnica', validado: true },
    { id: 's2', categoria: 'forca',       descricao: 'Certificação INMETRO e ensaio LM-79 já disponíveis para a linha ofertada', impacto: 5, validado: true },
    { id: 's3', categoria: 'fraqueza',    descricao: 'Nenhuma obra de telegestão do porte exigido concluída no país do edital', impacto: 5, recomendacao: 'Compor atestado com obra de Ribeira Alta + parceria técnica', validado: true },
    { id: 's4', categoria: 'fraqueza',    descricao: 'Exposição cambial de 30% do custo sem cláusula de reajuste', impacto: 4, recomendacao: 'Precificar hedge', validado: false },
    { id: 's5', categoria: 'oportunidade',descricao: 'Financiamento multilateral reduz risco de inadimplência do comprador', impacto: 4, validado: true },
    { id: 's6', categoria: 'oportunidade',descricao: 'Contrato de manutenção de 5 anos previsto como aditivo', impacto: 3, recomendacao: 'Precificar já pensando na recorrência', validado: false },
    { id: 's7', categoria: 'ameaca',      descricao: 'Especificação de protocolo proprietário pode favorecer concorrente específico', impacto: 5, recomendacao: 'Esclarecimento formal antes da proposta', validado: true },
    { id: 's8', categoria: 'ameaca',      descricao: '6 concorrentes estimados, 2 deles com fábrica local', impacto: 3, validado: false },
  ],
  pestel: [
    { id: 'pe1', categoria: 'politico',    descricao: 'Ano sem eleição municipal na região — baixo risco de descontinuidade do projeto', tendencia: 'estavel', impacto: 1,  fonte: 'Calendário eleitoral oficial', incerteza: 'baixa' },
    { id: 'pe2', categoria: 'economico',   descricao: 'Volatilidade cambial acima da média histórica no semestre', tendencia: 'piora', impacto: -2, fonte: 'Série histórica de câmbio', incerteza: 'alta' },
    { id: 'pe3', categoria: 'social',      descricao: 'Pressão pública por segurança urbana favorece investimento em iluminação', tendencia: 'melhora', impacto: 2, fonte: 'Plano diretor regional', incerteza: 'media' },
    { id: 'pe4', categoria: 'tecnologico', descricao: 'Telegestão deixou de ser diferencial e virou requisito mínimo', tendencia: 'melhora', impacto: 1, fonte: 'Editais comparáveis dos últimos 24 meses', incerteza: 'baixa' },
    { id: 'pe5', categoria: 'ambiental',   descricao: 'Meta de redução de consumo energético em 55% é critério de julgamento', tendencia: 'melhora', impacto: 3, fonte: 'Edital, item 12.2', incerteza: 'baixa' },
    { id: 'pe6', categoria: 'legal',       descricao: 'Regime de contratação exige matriz de risco assinada — prática recente', tendencia: 'estavel', impacto: -1, fonte: 'Marco legal de licitações', incerteza: 'media' },
  ],
  viabilidade: {
    receita: 68_400_000, custos: 44_500_000, tributos: 9_100_000,
    logistica: 2_800_000, capitalGiro: 11_000_000, prazoRecebimentoDias: 45,
  },
  camposExtraidos: [
    { campo: 'Objeto', valor: 'Fornecimento e instalação de 42.000 luminárias LED com sistema de telegestão', evidencia: { documento: 'Edital 042-2026.pdf', pagina: 3, secao: '1. Do objeto', trecho: '…contratação de empresa especializada para fornecimento, instalação e operação assistida de 42.000 (quarenta e duas mil) luminárias LED…', confianca: 0.96, revisadoPor: 'Marina Alencar', revisadoEm: emDias(-3) } },
    { campo: 'Valor estimado', valor: 'R$ 68.400.000,00', evidencia: { documento: 'Edital 042-2026.pdf', pagina: 7, secao: '4. Do valor', trecho: '…valor total estimado da contratação em R$ 68.400.000,00 (sessenta e oito milhões e quatrocentos mil reais)…', confianca: 0.99, revisadoPor: 'Marina Alencar', revisadoEm: emDias(-3) } },
    { campo: 'Prazo de entrega da proposta', valor: emDias(24), evidencia: { documento: 'Edital 042-2026.pdf', pagina: 2, secao: 'Preâmbulo', trecho: '…as propostas serão recebidas até as 14h00 do dia…', confianca: 0.93, revisadoPor: 'Marina Alencar', revisadoEm: emDias(-3) } },
    { campo: 'Critério de julgamento', valor: 'Menor preço global com pontuação técnica mínima', evidencia: { documento: 'Edital 042-2026.pdf', pagina: 22, secao: '8. Do julgamento', trecho: '…será declarada vencedora a proposta de menor preço global entre as habilitadas tecnicamente…', confianca: 0.88 } },
    { campo: 'Garantia exigida', valor: '1% do valor estimado', evidencia: { documento: 'Edital 042-2026.pdf', pagina: 38, secao: '11. Das garantias', trecho: '…garantia de proposta correspondente a 1% (um por cento) do valor estimado…', confianca: 0.95 } },
    { campo: 'Participação estrangeira', valor: 'Permitida, com representante legal no país', evidencia: { documento: 'Edital 042-2026.pdf', pagina: 17, secao: '6.9', trecho: '…empresas estrangeiras poderão participar desde que possuam representante legal no país…', confianca: 0.84 } },
    { campo: 'Reajuste', valor: 'Não previsto — preço fixo e irreajustável', evidencia: { documento: 'Edital 042-2026.pdf', pagina: 47, secao: '14.3', trecho: '…os preços serão fixos e irreajustáveis pelo período de vigência…', confianca: 0.91 } },
    { campo: 'Protocolo de telegestão', valor: 'Protocolo proprietário citado nominalmente', evidencia: { documento: 'Anexo II — Especificações.pdf', pagina: 12, secao: '4.7', trecho: '…o sistema deverá operar em protocolo compatível com a plataforma já instalada…', confianca: 0.62 } },
  ],
}

/* ---------------- demais oportunidades ---------------- */

const OUTRAS: Oportunidade[] = [
  {
    id: 'op-02', titulo: 'Substituição de 8.500 luminárias em vias arteriais', comprador: 'Municipalidad de Puerto Andino (fictício)',
    paisId: 'cl', tipo: 'Licitação pública', produtos: ['Luminárias LED'], valor: 4_200_000, moeda: 'USD',
    publicacao: emDias(-9), prazo: emDias(11), fonte: 'Portal de compras públicas', financiamento: 'Orçamento municipal',
    exigeParceiroLocal: false, etapa: 'proposta', responsavel: 'Marina Alencar', concorrentesEstimados: 4, demo: true,
    componentesAderencia: comps({ produtos: 88, certificacoes: 60, tecnica: 80, experiencia: 75, financeira: 70, logistica: 55, juridica: 90, prazo: 45, local: 40 }),
    riscos: [
      { id: 'r1', categoria: 'Prazo', descricao: 'Prazo curto para tradução juramentada de documentos', probabilidade: 4, impacto: 3, evidencia: 'Edital, item 7.2', mitigacao: 'Tradutor já acionado' },
      { id: 'r2', categoria: 'Logístico', descricao: 'Frete marítimo com janela apertada para a data de entrega', probabilidade: 3, impacto: 4, evidencia: 'Cronograma, p. 14', mitigacao: 'Reservar espaço em navio com antecedência' },
      { id: 'r3', categoria: 'Regulatório', descricao: 'Certificação local exigida além da INMETRO', probabilidade: 3, impacto: 4, evidencia: 'Anexo III', mitigacao: 'Processo de homologação em andamento' },
    ],
    documentos: [], prazos: [], swot: [], pestel: [], camposExtraidos: [],
    viabilidade: { receita: 4_200_000, custos: 2_900_000, tributos: 420_000, logistica: 260_000, capitalGiro: 800_000, prazoRecebimentoDias: 60 },
  },
  {
    id: 'op-03', titulo: 'Sistema de telegestão e sensores para corredor urbano inteligente', comprador: 'Alcaldía de San Miguel del Río (fictício)',
    paisId: 'co', tipo: 'Concorrência internacional', produtos: ['Telegestão', 'Sensores e IoT'], valor: 12_800_000, moeda: 'USD',
    publicacao: emDias(-5), prazo: emDias(38), fonte: 'Portal oficial', financiamento: 'Banco multilateral',
    exigeParceiroLocal: true, etapa: 'qualificada', responsavel: 'Rafael Nogueira', concorrentesEstimados: null, demo: true,
    componentesAderencia: comps({ produtos: 75, certificacoes: 55, tecnica: 70, experiencia: 40, financeira: 60, logistica: null, juridica: 65, prazo: 85, local: 20 }),
    riscos: [
      { id: 'r1', categoria: 'Jurídico', descricao: 'Exigência de consórcio com empresa local com no mínimo 30% de participação', probabilidade: 5, impacto: 5, evidencia: 'Edital, item 5.1', mitigacao: 'Nenhum parceiro local mapeado até o momento' },
      { id: 'r2', categoria: 'Político', descricao: 'Mudança de gestão municipal prevista para o período de execução', probabilidade: 3, impacto: 4, evidencia: 'Calendário eleitoral', mitigacao: 'Cláusula de continuidade contratual' },
      { id: 'r3', categoria: 'Recebimento', descricao: 'Histórico de atraso de pagamento no órgão comprador', probabilidade: 3, impacto: 4, evidencia: 'Não confirmado — fonte secundária', mitigacao: 'Confirmar antes de avançar' },
    ],
    documentos: [], prazos: [], swot: [], pestel: [], camposExtraidos: [],
    viabilidade: null,
  },
  {
    id: 'op-04', titulo: 'Iluminação pública solar para 26 comunidades rurais', comprador: 'Agência Regional de Desenvolvimento do Norte (fictício)',
    paisId: 'br', tipo: 'Pregão eletrônico', produtos: ['Luminárias solares'], valor: 3_100_000, moeda: 'BRL',
    publicacao: emDias(-2), prazo: emDias(16), fonte: 'Portal de compras', financiamento: 'Fundo regional',
    exigeParceiroLocal: false, etapa: 'triagem', responsavel: 'Marina Alencar', concorrentesEstimados: 9, demo: true,
    componentesAderencia: comps({ produtos: 35, certificacoes: 70, tecnica: 50, experiencia: 25, financeira: 80, logistica: 60, juridica: 95, prazo: 70, local: 75 }),
    riscos: [
      { id: 'r1', categoria: 'Técnico', descricao: 'Linha solar não faz parte do portfólio próprio — dependeria de revenda', probabilidade: 5, impacto: 4, evidencia: 'Perfil da organização', mitigacao: 'Avaliar fornecedor OEM' },
      { id: 'r2', categoria: 'Financeiro', descricao: 'Margem estimada abaixo do piso interno de 12%', probabilidade: 4, impacto: 3, evidencia: 'Simulação de viabilidade', mitigacao: 'Renegociar custo do OEM' },
    ],
    documentos: [], prazos: [], swot: [], pestel: [], camposExtraidos: [],
    viabilidade: { receita: 3_100_000, custos: 2_500_000, tributos: 340_000, logistica: 180_000, capitalGiro: 600_000, prazoRecebimentoDias: 30 },
  },
  {
    id: 'op-05', titulo: 'Requalificação luminotécnica do centro histórico', comprador: 'Câmara Municipal de Vila Marégia (fictício)',
    paisId: 'pt', tipo: 'Concurso público', produtos: ['Luminárias LED', 'Projetos luminotécnicos'], valor: 2_450_000, moeda: 'EUR',
    publicacao: emDias(-25), prazo: emDias(4), fonte: 'Diário oficial', financiamento: 'Fundos europeus',
    exigeParceiroLocal: false, etapa: 'enviada', responsavel: 'Marina Alencar', concorrentesEstimados: 5, demo: true,
    componentesAderencia: comps({ produtos: 80, certificacoes: 85, tecnica: 90, experiencia: 65, financeira: 70, logistica: 65, juridica: 85, prazo: 30, local: 60 }),
    riscos: [
      { id: 'r1', categoria: 'Prazo', descricao: 'Proposta enviada, aguardando abertura em 4 dias', probabilidade: 1, impacto: 2, evidencia: 'Protocolo de envio', mitigacao: '—' },
      { id: 'r2', categoria: 'Técnico', descricao: 'Restrição patrimonial exige aprovação estética das luminárias', probabilidade: 3, impacto: 3, evidencia: 'Anexo patrimonial', mitigacao: 'Modelo já aprovado em projeto anterior' },
    ],
    documentos: [], prazos: [], swot: [], pestel: [], camposExtraidos: [],
    viabilidade: { receita: 2_450_000, custos: 1_500_000, tributos: 290_000, logistica: 95_000, capitalGiro: 400_000, prazoRecebimentoDias: 40 },
  },
  {
    id: 'op-06', titulo: 'Fornecimento de 15.000 luminárias com contrato de eficiência energética', comprador: 'Instituto Metropolitano de Servicios Urbanos (fictício)',
    paisId: 'mx', tipo: 'Concorrência internacional', produtos: ['Luminárias LED', 'Eficiência energética'], valor: 19_600_000, moeda: 'USD',
    publicacao: emDias(-12), prazo: emDias(31), fonte: 'Portal oficial', financiamento: 'PPP / contrato de performance',
    exigeParceiroLocal: true, etapa: 'analise', responsavel: 'Rafael Nogueira', concorrentesEstimados: 7, demo: true,
    componentesAderencia: comps({ produtos: 85, certificacoes: 65, tecnica: 75, experiencia: 55, financeira: 45, logistica: 60, juridica: 55, prazo: 75, local: 35 }),
    riscos: [
      { id: 'r1', categoria: 'Financeiro', descricao: 'Contrato de performance exige capital de giro por 18 meses antes do primeiro recebimento', probabilidade: 4, impacto: 5, evidencia: 'Minuta contratual, cláusula 9', mitigacao: 'Estruturar financiamento com banco parceiro' },
      { id: 'r2', categoria: 'Jurídico', descricao: 'Necessário representante legal e registro fiscal no país', probabilidade: 4, impacto: 4, evidencia: 'Edital, item 5', mitigacao: 'Abrir filial ou consorciar' },
      { id: 'r3', categoria: 'Execução', descricao: 'Meta de economia energética auditada com multa por não atingimento', probabilidade: 3, impacto: 5, evidencia: 'Anexo de performance', mitigacao: 'Dimensionar com margem de segurança' },
      { id: 'r4', categoria: 'Cambial', descricao: 'Receita em moeda local com custo em dólar', probabilidade: 4, impacto: 4, evidencia: 'Minuta contratual', mitigacao: 'Hedge cambial de longo prazo' },
    ],
    documentos: [], prazos: [], swot: [], pestel: [], camposExtraidos: [],
    viabilidade: { receita: 19_600_000, custos: 13_800_000, tributos: 2_100_000, logistica: 900_000, capitalGiro: 7_000_000, prazoRecebimentoDias: 540 },
  },
  {
    id: 'op-07', titulo: 'Manutenção corretiva e preventiva do parque de iluminação', comprador: 'Prefeitura de Serra do Cedro (fictício)',
    paisId: 'br', tipo: 'Pregão eletrônico', produtos: ['Manutenção'], valor: 5_800_000, moeda: 'BRL',
    publicacao: emDias(-30), prazo: emDias(-2), fonte: 'Portal de compras', financiamento: 'Orçamento municipal',
    exigeParceiroLocal: false, etapa: 'descartada', responsavel: 'Marina Alencar', concorrentesEstimados: 12, demo: true,
    decisao: 'nao_participar', decisaoJustificativa: 'Prazo encerrado e serviço fora do escopo de fornecimento da empresa.',
    componentesAderencia: comps({ produtos: 20, certificacoes: 60, tecnica: 35, experiencia: 15, financeira: 70, logistica: 40, juridica: 90, prazo: 0, local: 80 }),
    riscos: [{ id: 'r1', categoria: 'Prazo', descricao: 'Prazo de entrega da proposta encerrado', probabilidade: 5, impacto: 5, evidencia: 'Data-limite do edital', mitigacao: '—' }],
    documentos: [], prazos: [], swot: [], pestel: [], camposExtraidos: [], viabilidade: null,
  },
  {
    id: 'op-08', titulo: 'Postes e braços galvanizados para expansão de rede urbana', comprador: 'Companhia de Desenvolvimento de Vale Sereno (fictício)',
    paisId: 'br', tipo: 'Pregão eletrônico', produtos: ['Postes e braços'], valor: 1_900_000, moeda: 'BRL',
    publicacao: emDias(-6), prazo: emDias(19), fonte: 'Portal de compras', financiamento: 'Orçamento próprio',
    exigeParceiroLocal: false, etapa: 'identificada', responsavel: '—', concorrentesEstimados: null, demo: true,
    componentesAderencia: comps({ produtos: 45, certificacoes: null, tecnica: null, experiencia: 30, financeira: 75, logistica: null, juridica: 90, prazo: 80, local: 85 }),
    riscos: [], documentos: [], prazos: [], swot: [], pestel: [], camposExtraidos: [], viabilidade: null,
  },
  {
    id: 'op-09', titulo: 'Plataforma de gestão de ativos de iluminação e mobiliário urbano', comprador: 'Agencia de Ciudad Inteligente de Bahía Norte (fictício)',
    paisId: 'cl', tipo: 'Concorrência internacional', produtos: ['Software', 'Gestão de ativos'], valor: 6_400_000, moeda: 'USD',
    publicacao: emDias(-14), prazo: emDias(28), fonte: 'Portal de compras públicas', financiamento: 'Orçamento nacional',
    exigeParceiroLocal: false, etapa: 'decisao', responsavel: 'Rafael Nogueira', concorrentesEstimados: 5, demo: true,
    componentesAderencia: comps({ produtos: 60, certificacoes: 50, tecnica: 65, experiencia: 45, financeira: 75, logistica: 90, juridica: 85, prazo: 80, local: 55 }),
    riscos: [
      { id: 'r1', categoria: 'Técnico', descricao: 'Exigência de integração com 4 sistemas legados não documentados', probabilidade: 4, impacto: 4, evidencia: 'Anexo técnico, p. 22', mitigacao: 'Solicitar documentação das APIs antes da proposta' },
      { id: 'r2', categoria: 'Reputacional', descricao: 'Projeto com alta visibilidade pública e metas divulgadas em imprensa', probabilidade: 2, impacto: 4, evidencia: 'Contexto público', mitigacao: 'Reforçar equipe de implantação' },
    ],
    documentos: [], prazos: [], swot: [], pestel: [], camposExtraidos: [], viabilidade: null,
  },
  {
    id: 'op-10', titulo: 'Modernização de 5.200 pontos com telegestão em bairro-piloto', comprador: 'Município de Ribeira Alta (fictício)',
    paisId: 'br', tipo: 'Concorrência', produtos: ['Luminárias LED', 'Telegestão'], valor: 9_700_000, moeda: 'BRL',
    publicacao: emDias(-95), prazo: emDias(-60), fonte: 'Portal oficial', financiamento: 'Orçamento municipal',
    exigeParceiroLocal: false, etapa: 'vencida', responsavel: 'Marina Alencar', concorrentesEstimados: 3, demo: true,
    decisao: 'participar', decisaoJustificativa: 'Aderência alta, risco moderado e sinergia com o parque já instalado na região.',
    componentesAderencia: comps({ produtos: 95, certificacoes: 90, tecnica: 92, experiencia: 85, financeira: 80, logistica: 85, juridica: 100, prazo: 90, local: 90 }),
    riscos: [{ id: 'r1', categoria: 'Execução', descricao: 'Obra em andamento dentro do cronograma', probabilidade: 2, impacto: 2, evidencia: 'Relatório de obra', mitigacao: 'Acompanhamento mensal' }],
    documentos: [], prazos: [], swot: [], pestel: [], camposExtraidos: [],
    viabilidade: { receita: 9_700_000, custos: 6_100_000, tributos: 1_150_000, logistica: 320_000, capitalGiro: 1_500_000, prazoRecebimentoDias: 45 },
  },
]

export const OPORTUNIDADES_DEMO: Oportunidade[] = [EDITAL_COMPLETO, ...OUTRAS]
