/* ============================================================
   X369life — motor de decisão.
   Três cálculos, todos EXPLICÁVEIS: aderência (§16), risco (§17) e
   probabilidade de vitória (pedido do Isaac em 16/08: "decisões mais
   assertivas com alto nível de probabilidade futura").

   Regra que atravessa tudo: dado ausente NUNCA vira atendimento
   integral, e nenhuma nota aparece sem o seu nível de confiança.
   ============================================================ */

import type {
  ComponenteAderencia, Decisao, ItemRisco, NivelRisco,
  Oportunidade, PerfilOrganizacao, Viabilidade,
} from './tipos'

/* ---------- pesos padrão da aderência (§16 do briefing) ---------- */
export const PESOS_ADERENCIA_PADRAO: Record<string, number> = {
  produtos: 20, certificacoes: 15, tecnica: 15, experiencia: 10,
  financeira: 10, logistica: 10, juridica: 10, prazo: 5, local: 5,
}

export const ROTULOS_ADERENCIA: Record<string, string> = {
  produtos: 'Compatibilidade dos produtos',
  certificacoes: 'Certificações',
  tecnica: 'Capacidade técnica',
  experiencia: 'Experiência anterior',
  financeira: 'Capacidade financeira',
  logistica: 'Capacidade logística',
  juridica: 'Elegibilidade jurídica',
  prazo: 'Prazo disponível',
  local: 'Presença ou parceria local',
}

export interface ResultadoAderencia {
  /** Nota efetiva 0–100. Componente ausente entra como zero. */
  nota: number
  /** % do peso total que tem dado — é a confiança do cálculo. */
  confianca: number
  /** Teto se todas as lacunas forem preenchidas com atendimento pleno. */
  potencial: number
  fortes: ComponenteAderencia[]
  lacunas: ComponenteAderencia[]
  ausentes: ComponenteAderencia[]
}

export function calcularAderencia(comps: ComponenteAderencia[]): ResultadoAderencia {
  const pesoTotal = comps.reduce((s, c) => s + c.peso, 0) || 100
  let soma = 0
  let pesoComDado = 0
  for (const c of comps) {
    if (c.score === null) continue
    soma += (c.score * c.peso) / 100
    pesoComDado += c.peso
  }
  const nota = Math.round((soma / pesoTotal) * 100)
  const confianca = Math.round((pesoComDado / pesoTotal) * 100)
  const pesoAusente = pesoTotal - pesoComDado
  const potencial = Math.round(((soma + pesoAusente) / pesoTotal) * 100)
  return {
    nota, confianca, potencial,
    fortes: comps.filter((c) => c.score !== null && c.score >= 75),
    lacunas: comps.filter((c) => c.score !== null && c.score < 50),
    ausentes: comps.filter((c) => c.score === null),
  }
}

/* ---------- risco (§17) ---------- */

export interface ResultadoRisco {
  /** null = nenhum risco avaliado ainda. Não é o mesmo que risco zero. */
  score: number | null
  nivel: NivelRisco
  porCategoria: { categoria: string; score: number; itens: ItemRisco[] }[]
  criticos: ItemRisco[]
}

export const criticidade = (r: ItemRisco) => r.probabilidade * r.impacto  // 1..25

export function nivelDeRisco(score: number): NivelRisco {
  if (score < 25) return 'baixo'
  if (score < 50) return 'moderado'
  if (score < 75) return 'alto'
  return 'critico'
}

export function calcularRisco(itens: ItemRisco[]): ResultadoRisco {
  // Sem risco REGISTRADO não é sem risco EXISTENTE. Devolver 0/'baixo' aqui
  // fazia a ausência de avaliação virar selo verde na tela e bônus na
  // probabilidade — o oposto da regra que abre este arquivo. `score: null`
  // é a mesma convenção já usada na aderência: ausência declarada.
  if (itens.length === 0) {
    return { score: null, nivel: 'nao_avaliado', porCategoria: [], criticos: [] }
  }
  const cats = [...new Set(itens.map((i) => i.categoria))]
  const porCategoria = cats.map((categoria) => {
    const doGrupo = itens.filter((i) => i.categoria === categoria)
    // max dentro da categoria, não média: um risco de inabilitação não pode
    // ser diluído por cinco riscos irrelevantes ao lado dele.
    const pior = Math.max(...doGrupo.map(criticidade))
    return { categoria, score: Math.round(((pior - 1) / 24) * 100), itens: doGrupo }
  })
  // O pior risco manda, entre categorias também. Fazer média aqui só empurrava
  // a diluição um nível acima: registrar dois riscos triviais ao lado de uma
  // inabilitação certa derrubava o score de 100 para 33 e virava "Participar".
  // Registrar informação nunca pode deixar o sistema menos cauteloso.
  const score = Math.max(...porCategoria.map((c) => c.score))
  return {
    score,
    nivel: nivelDeRisco(score),
    porCategoria: porCategoria.sort((a, b) => b.score - a.score),
    criticos: itens.filter((i) => criticidade(i) >= 15).sort((a, b) => criticidade(b) - criticidade(a)),
  }
}

/* ============================================================
   PROBABILIDADE DE VITÓRIA — modelo explicável
   ------------------------------------------------------------
   NÃO é um modelo estatístico treinado: é um modelo causal em
   log-odds, com cada fator contribuindo de forma visível. A UI
   mostra a decomposição — o usuário vê de onde veio o número e
   pode discordar de cada parcela. Isso é deliberado: recomendação
   sem evidência é o que o briefing proíbe (§37).
   ============================================================ */

export interface FatorProbabilidade {
  label: string
  detalhe: string
  /** contribuição em log-odds (positiva ajuda, negativa atrapalha) */
  contribuicao: number
  conhecido: boolean
}

export interface ResultadoProbabilidade {
  p: number                       // 0..1
  faixa: [number, number]         // intervalo pela incerteza dos dados
  confianca: number               // 0..100
  fatores: FatorProbabilidade[]
  base: number                    // ponto de partida (1/concorrentes)
}

const logit = (p: number) => Math.log(p / (1 - p))
const sigmoide = (z: number) => 1 / (1 + Math.exp(-z))
const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export interface EntradaProbabilidade {
  aderencia: ResultadoAderencia
  risco: ResultadoRisco
  /** null = edital sem prazo informado. */
  diasRestantes: number | null
  concorrentesEstimados: number | null
  historicoPropostas: number
  historicoVitorias: number
  exigeParceiroLocal: boolean
  /** null = critério nunca avaliado. Não é o mesmo que não atende. */
  temParceiroLocal: boolean | null
}

export function calcularProbabilidade(e: EntradaProbabilidade): ResultadoProbabilidade {
  const fatores: FatorProbabilidade[] = []

  /* 1. Base: numa disputa sem informação, a chance é 1/n concorrentes.
        Sem estimativa de concorrência, assume-se 5 (mediana típica de
        licitação internacional de fornecimento) e a confiança cai.      */
  const nConhecido = e.concorrentesEstimados !== null && e.concorrentesEstimados > 0
  const n = nConhecido ? (e.concorrentesEstimados as number) : 5
  const base = limitar(1 / n, 0.02, 0.5)
  let z = logit(base)
  fatores.push({
    label: 'Concorrência',
    detalhe: nConhecido ? `${n} concorrentes estimados` : 'não informada — assumidos 5',
    contribuicao: 0,   // o efeito da concorrência é a própria base — ver `base`
    conhecido: nConhecido,
  })

  /* 2. Aderência: o driver principal. Centrada em 60 (abaixo disso a
        empresa costuma nem habilitar). Escala ±1,6 em log-odds.          */
  const cA = ((e.aderencia.nota - 60) / 40) * 1.6
  z += cA
  fatores.push({
    label: 'Aderência ao edital',
    detalhe: `${e.aderencia.nota}/100 (confiança ${e.aderencia.confianca}%)`,
    contribuicao: cA,
    conhecido: e.aderencia.confianca >= 60,
  })

  /* 3. Risco: penaliza, com metade do peso da aderência — risco alto
        derruba execução e habilitação, mas não decide sozinho.           */
  // Risco não avaliado não empurra a probabilidade para lado nenhum. Antes,
  // score 0 rendia +0,6 de contribuição — 13 pontos percentuais de vitória
  // ganhos por não ter avaliado nada.
  const riscoAvaliado = e.risco.score !== null
  const cR = e.risco.score !== null ? -((e.risco.score - 30) / 40) * 0.8 : 0
  z += cR
  fatores.push({
    label: 'Risco da operação',
    detalhe: riscoAvaliado ? `${e.risco.score}/100 · ${e.risco.nivel}` : 'ainda não avaliado',
    contribuicao: cR,
    conhecido: riscoAvaliado,
  })

  /* 4. Histórico da própria empresa — ajuste bayesiano contra uma
        prior de 20% de vitória, com peso proporcional à amostra.         */
  const temHistorico = e.historicoPropostas >= 3
  let cH = 0
  if (temHistorico) {
    const taxa = e.historicoVitorias / e.historicoPropostas
    const peso = Math.min(1, e.historicoPropostas / 12)   // 12 propostas = peso cheio
    cH = (logit(limitar(taxa, 0.03, 0.85)) - logit(0.2)) * peso * 0.6
    z += cH
  }
  fatores.push({
    label: 'Histórico da empresa',
    detalhe: temHistorico
      ? `${e.historicoVitorias} vitórias em ${e.historicoPropostas} propostas`
      : 'histórico insuficiente (< 3 propostas)',
    contribuicao: cH,
    conhecido: temHistorico,
  })

  /* 5. Prazo: abaixo de 20 dias a preparação sofre; abaixo de 7 é grave. */
  let cP = 0
  const d = e.diasRestantes
  if (d !== null) {
    if (d <= 0) cP = -2.2
    else if (d < 7) cP = -1.0
    else if (d < 20) cP = -0.4
  }
  z += cP
  fatores.push({
    label: 'Prazo disponível',
    detalhe: d === null ? 'prazo não informado'
      : d <= 0 ? 'prazo encerrado' : `${d} dias até a entrega`,
    contribuicao: cP,
    conhecido: d !== null,
  })

  /* 6. Exigência de parceiro local não atendida é quase eliminatória.    */
  // `temParceiroLocal` é null quando o critério nunca foi avaliado. Antes,
  // null virava false: -1,2 de penalidade e a tela AFIRMANDO "exigido e NÃO
  // atendido" sobre algo que ninguém tinha olhado.
  let cL = 0
  const localSabido = e.temParceiroLocal !== null
  if (e.exigeParceiroLocal && localSabido) cL = e.temParceiroLocal ? 0.35 : -1.2
  z += cL
  fatores.push({
    label: 'Parceiro local',
    detalhe: !e.exigeParceiroLocal ? 'não exigido'
      : !localSabido ? 'exigido — atendimento não avaliado'
        : e.temParceiroLocal ? 'exigido e atendido' : 'exigido e NÃO atendido',
    contribuicao: cL,
    conhecido: !e.exigeParceiroLocal || localSabido,
  })

  const p = limitar(sigmoide(z), 0.01, 0.95)

  /* Confiança = quanto do modelo está apoiado em dado real.
     A faixa abre proporcionalmente à falta de dado — probabilidade
     sozinha engana; probabilidade com intervalo, não.                    */
  const conhecidos = fatores.filter((f) => f.conhecido).length
  const confianca = Math.round(
    (conhecidos / fatores.length) * 60 + (e.aderencia.confianca / 100) * 40,
  )
  const amplitude = (1 - confianca / 100) * 0.28 + 0.05
  const faixa: [number, number] = [
    limitar(p - amplitude, 0.01, 0.95),
    limitar(p + amplitude, 0.01, 0.95),
  ]

  return { p, faixa, confianca, fatores, base }
}

/* ---------- viabilidade e valor esperado ---------- */

export interface ResultadoViabilidade {
  margem: number
  margemPct: number
  valorEsperado: number
  cenarios: { nome: string; p: number; margem: number; valorEsperado: number }[]
}

export function calcularViabilidade(
  v: Viabilidade, valorEdital: number, prob: ResultadoProbabilidade,
): ResultadoViabilidade {
  // Sem receita informada, o valor estimado do edital é a melhor referência.
  const receita = v.receita > 0 ? v.receita : valorEdital
  const custoTotal = v.custos + v.tributos + v.logistica
  const margem = receita - custoTotal
  const margemPct = receita > 0 ? (margem / receita) * 100 : 0
  const cen = (nome: string, p: number, fatorCusto: number) => {
    const m = receita - custoTotal * fatorCusto
    return { nome, p, margem: m, valorEsperado: m * p }
  }
  return {
    margem, margemPct,
    valorEsperado: margem * prob.p,
    cenarios: [
      cen('Pessimista', prob.faixa[0], 1.15),
      cen('Base', prob.p, 1.0),
      cen('Otimista', prob.faixa[1], 0.93),
    ],
  }
}

/* ---------- recomendação derivada (§37) ---------- */

export interface ResultadoRecomendacao {
  decisao: Decisao
  titulo: string
  motivos: string[]
  confianca: number
}

export function recomendar(
  ad: ResultadoAderencia, rk: ResultadoRisco, prob: ResultadoProbabilidade,
  o: Pick<Oportunidade, 'exigeParceiroLocal'>, diasRestantes: number | null,
): ResultadoRecomendacao {
  const motivos: string[] = []
  const juridica = ad.lacunas.find((c) => c.id === 'juridica')
  const inelegivel = juridica?.score === 0

  if (inelegivel) {
    motivos.push('Elegibilidade jurídica reprovada — a empresa não atende à condição de participação.')
    return { decisao: 'nao_participar', titulo: 'Não participar', motivos, confianca: prob.confianca }
  }
  if (diasRestantes !== null && diasRestantes <= 0) {
    motivos.push('O prazo de entrega da proposta já se encerrou.')
    return { decisao: 'nao_participar', titulo: 'Não participar', motivos, confianca: prob.confianca }
  }
  if (ad.confianca < 50) {
    motivos.push(`Só ${ad.confianca}% dos critérios têm dado — a nota de ${ad.nota} não é confiável.`)
    motivos.push(`Faltam: ${ad.ausentes.map((a) => a.label).join(', ')}.`)
    return { decisao: 'aguardar', titulo: 'Aguardar — dados insuficientes', motivos, confianca: prob.confianca }
  }
  if (rk.criticos.length > 0 && rk.nivel === 'critico') {
    motivos.push(`${rk.criticos.length} risco(s) crítico(s) sem mitigação definida.`)
    motivos.push('Recomenda-se esclarecimento formal antes de comprometer proposta.')
    return { decisao: 'esclarecimento', titulo: 'Solicitar esclarecimento', motivos, confianca: prob.confianca }
  }
  if (rk.score === null && ad.nota >= 70) {
    motivos.push(`Aderência ${ad.nota}/100 com ${ad.confianca}% de confiança.`)
    motivos.push('Nenhum risco foi avaliado ainda — sem isso não há como recomendar participação.')
    return { decisao: 'aguardar', titulo: 'Aguardar — risco não avaliado', motivos, confianca: prob.confianca }
  }
  if (ad.nota >= 70 && rk.score !== null && rk.score < 50) {
    motivos.push(`Aderência ${ad.nota}/100 com ${ad.confianca}% de confiança.`)
    motivos.push(`Risco ${rk.nivel} (${rk.score}/100).`)
    motivos.push(`Probabilidade estimada de vitória: ${Math.round(prob.p * 100)}%.`)
    return { decisao: 'participar', titulo: 'Participar', motivos, confianca: prob.confianca }
  }
  if (ad.nota >= 70) {
    motivos.push(`Aderência alta (${ad.nota}), mas risco ${rk.nivel} (${rk.score ?? '—'}).`)
    motivos.push(`Mitigar: ${rk.criticos.slice(0, 2).map((r) => r.descricao).join(' · ') || 'ver aba Riscos'}.`)
    return { decisao: 'participar', titulo: 'Participar com mitigação', motivos, confianca: prob.confianca }
  }
  const lacunaLocal = ad.lacunas.find((c) => c.id === 'local') || ad.ausentes.find((c) => c.id === 'local')
  if (ad.nota >= 50 && o.exigeParceiroLocal && lacunaLocal) {
    motivos.push('O edital exige presença local e este é o componente mais fraco da avaliação.')
    motivos.push(`Com parceiro local, a aderência sobe para até ${ad.potencial}.`)
    return { decisao: 'parceiro_local', titulo: 'Buscar parceiro local', motivos, confianca: prob.confianca }
  }
  if (ad.nota >= 50) {
    motivos.push(`Aderência intermediária (${ad.nota}). Lacunas: ${ad.lacunas.map((l) => l.label).join(', ') || '—'}.`)
    motivos.push('Reunir documentação e certificações antes de decidir.')
    return { decisao: 'documentacao', titulo: 'Reunir documentação', motivos, confianca: prob.confianca }
  }
  motivos.push(`Aderência baixa (${ad.nota}/100) com ${ad.confianca}% de confiança.`)
  motivos.push(`Probabilidade estimada de vitória: ${Math.round(prob.p * 100)}%.`)
  return { decisao: 'nao_participar', titulo: 'Não participar', motivos, confianca: prob.confianca }
}

/* ---------- avaliação completa de uma oportunidade ---------- */

export interface Avaliacao {
  aderencia: ResultadoAderencia
  risco: ResultadoRisco
  probabilidade: ResultadoProbabilidade
  viabilidade: ResultadoViabilidade | null
  recomendacao: ResultadoRecomendacao
  /** null = edital sem prazo informado. */
  diasRestantes: number | null
}

export function diasAte(prazo: string | null): number | null {
  // Sem prazo informado não há janela: `null` em vez de NaN, que sumia da
  // carteira em silêncio porque toda comparação com NaN é falsa.
  if (!prazo) return null
  const alvo = new Date(prazo + 'T23:59:59')
  return Math.ceil((alvo.getTime() - Date.now()) / 86_400_000)
}

export function avaliar(o: Oportunidade, perfil: PerfilOrganizacao): Avaliacao {
  const aderencia = calcularAderencia(o.componentesAderencia)
  const risco = calcularRisco(o.riscos)
  const diasRestantes = diasAte(o.prazo)
  const compLocal = o.componentesAderencia.find((c) => c.id === 'local')
  const probabilidade = calcularProbabilidade({
    aderencia, risco, diasRestantes,
    concorrentesEstimados: o.concorrentesEstimados,
    historicoPropostas: perfil.historicoPropostas,
    historicoVitorias: perfil.historicoVitorias,
    exigeParceiroLocal: o.exigeParceiroLocal,
    temParceiroLocal: compLocal?.score == null ? null : compLocal.score >= 60,
  })
  return {
    aderencia, risco, probabilidade, diasRestantes,
    viabilidade: o.viabilidade ? calcularViabilidade(o.viabilidade, o.valor, probabilidade) : null,
    recomendacao: recomendar(aderencia, risco, probabilidade, o, diasRestantes),
  }
}
