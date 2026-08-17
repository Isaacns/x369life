/* ============================================================
   Motor de padrões — o cruzamento que a IA depois interpreta.

   Duas camadas, deliberadamente separadas:
   · CAMADA 1 (este arquivo): cruzamentos determinísticos sobre todos os
     dados da carteira. Roda sem chave, sem custo, sem inventar nada —
     cada achado carrega os números que o produziram.
   · CAMADA 2 (lib/ia.ts): a leitura narrativa do Claude, que recebe estes
     achados + o texto dos editais e escreve a interpretação. Dormente.

   A ordem importa: um número cruzado errado, bem escrito pela IA, é pior
   que nenhum texto. A camada 1 é a que precisa estar certa.
   ============================================================ */

import type { Avaliacao } from './scoring'
import { criticidade } from './scoring'
import type { Oportunidade, PerfilOrganizacao } from './tipos'
import { ROTULOS_ADERENCIA } from './scoring'
import { paisPorId } from './demo'

export type Severidade = 'critico' | 'atencao' | 'oportunidade' | 'informativo'

export interface Achado {
  id: string
  tipo: string
  severidade: Severidade
  titulo: string
  detalhe: string
  /** Os números que sustentam o achado — sem isto, é opinião. */
  evidencias: string[]
  recomendacao: string
  /** Valor da carteira afetado, quando faz sentido quantificar. */
  valorEmJogo?: number
  /** Quantas oportunidades sustentam o padrão — amostra pequena é declarada. */
  amostra: number
}

export interface Linha { o: Oportunidade; a: Avaliacao }

const ENCERRADAS = ['vencida', 'perdida', 'descartada']
const pctStr = (v: number) => `${Math.round(v)}%`

export function cruzarPadroes(linhas: Linha[], perfil: PerfilOrganizacao): Achado[] {
  const achados: Achado[] = []
  const abertas = linhas.filter(({ o, a }) => !ENCERRADAS.includes(o.etapa) && (a.diasRestantes === null || a.diasRestantes > 0))
  if (abertas.length === 0) return achados

  const valorPonderadoTotal = abertas.reduce((s, { o, a }) => s + o.valor * a.probabilidade.p, 0)

  /* ---------- 1. Concentração de carteira ---------- */
  const porChave = (fn: (l: Linha) => string) => {
    const m = new Map<string, { valor: number; qtd: number }>()
    for (const l of abertas) {
      const k = fn(l)
      const at = m.get(k) ?? { valor: 0, qtd: 0 }
      at.valor += l.o.valor * l.a.probabilidade.p
      at.qtd += 1
      m.set(k, at)
    }
    return [...m.entries()].sort((x, y) => y[1].valor - x[1].valor)
  }

  for (const [dimensao, expressao, fn, comoDiluir] of [
    ['país', 'um único país', (l: Linha) => paisPorId(l.o.paisId).nome, 'abrir frente em outro mercado da lista de interesse'],
    ['comprador', 'um único comprador', (l: Linha) => l.o.comprador, 'prospectar compradores distintos na mesma região'],
    ['linha de produto', 'uma única linha de produto', (l: Linha) => l.o.produtos[0] ?? '—', 'qualificar editais de outras categorias do catálogo'],
  ] as [string, string, (l: Linha) => string, string][]) {
    const ranking = porChave(fn)
    const [lider, dados] = ranking[0]
    const share = valorPonderadoTotal > 0 ? (dados.valor / valorPonderadoTotal) * 100 : 0
    if (share >= 55 && abertas.length >= 3) {
      achados.push({
        id: `conc-${dimensao}`,
        tipo: 'Concentração',
        severidade: share >= 75 ? 'critico' : 'atencao',
        titulo: `${pctStr(share)} do valor esperado depende de ${expressao}`,
        detalhe: `“${lider}” responde por ${pctStr(share)} de tudo que a carteira pode gerar. `
          + `Um revés isolado nessa frente derruba o ano inteiro, e o resultado passa a depender de um fator que a empresa não controla.`,
        evidencias: [
          `${lider}: ${dados.qtd} oportunidade(s), ${fmtMi(dados.valor)} de valor esperado`,
          `Carteira total: ${abertas.length} oportunidades, ${fmtMi(valorPonderadoTotal)} esperados`,
          ranking[1] ? `Segundo colocado: ${ranking[1][0]} com ${fmtMi(ranking[1][1].valor)}` : 'Não há segundo colocado relevante',
        ],
        recomendacao: `Reduzir a dependência: ${comoDiluir}.`,
        valorEmJogo: dados.valor,
        amostra: abertas.length,
      })
    }
  }

  /* ---------- 2. Categoria de risco reincidente ----------
     Risco que aparece em várias oportunidades não é problema do edital:
     é problema estrutural da empresa. A distinção muda o que se faz. */
  const porCategoria = new Map<string, { qtd: number; soma: number; valor: number }>()
  for (const { o, a } of abertas) {
    for (const cat of new Set(a.risco.porCategoria.map((c) => c.categoria))) {
      const itens = a.risco.porCategoria.find((c) => c.categoria === cat)!.itens
      const pior = Math.max(...itens.map(criticidade))
      const at = porCategoria.get(cat) ?? { qtd: 0, soma: 0, valor: 0 }
      at.qtd += 1; at.soma += pior; at.valor += o.valor
      porCategoria.set(cat, at)
    }
  }
  for (const [cat, d] of porCategoria) {
    const media = d.soma / d.qtd
    if (d.qtd >= 3 && media >= 12) {
      achados.push({
        id: `risco-${cat}`,
        tipo: 'Risco estrutural',
        severidade: media >= 16 ? 'critico' : 'atencao',
        titulo: `Risco ${cat.toLowerCase()} se repete em ${d.qtd} de ${abertas.length} editais`,
        detalhe: `Não é característica de um edital: é uma fragilidade da operação que reaparece em toda disputa. `
          + `Tratar caso a caso custa mais caro do que resolver a causa uma vez.`,
        evidencias: [
          `Criticidade média nesta categoria: ${media.toFixed(1)} de 25`,
          `Presente em ${d.qtd} oportunidade(s), somando ${fmtMi(d.valor)} em valor de edital`,
        ],
        recomendacao: `Abrir uma frente estrutural para ${cat.toLowerCase()} em vez de mitigar edital a edital.`,
        valorEmJogo: d.valor,
        amostra: d.qtd,
      })
    }
  }

  /* ---------- 3. Lacuna de capacidade que mais custa dinheiro ----------
     Quanto valor esperado destravaria se este critério fosse resolvido. */
  const porCriterio = new Map<string, { fraco: number; ausente: number; ganho: number; valor: number }>()
  for (const { o } of abertas) {
    for (const c of o.componentesAderencia) {
      const at = porCriterio.get(c.id) ?? { fraco: 0, ausente: 0, ganho: 0, valor: 0 }
      if (c.score === null) { at.ausente += 1; at.ganho += (c.peso / 100) * o.valor * 0.35; at.valor += o.valor }
      else if (c.score < 50) { at.fraco += 1; at.ganho += ((100 - c.score) / 100) * (c.peso / 100) * o.valor * 0.35; at.valor += o.valor }
      porCriterio.set(c.id, at)
    }
  }
  const lacunas = [...porCriterio.entries()]
    .filter(([, d]) => d.fraco + d.ausente >= Math.max(2, Math.ceil(abertas.length * 0.4)))
    .sort((x, y) => y[1].ganho - x[1].ganho)
  if (lacunas.length > 0) {
    const [id, d] = lacunas[0]
    achados.push({
      id: `lacuna-${id}`,
      tipo: 'Lacuna de capacidade',
      severidade: 'oportunidade',
      titulo: `“${ROTULOS_ADERENCIA[id] ?? id}” trava ${d.fraco + d.ausente} de ${abertas.length} editais`,
      detalhe: `Este é o critério que mais aparece como fraco ou sem informação na carteira inteira. `
        + `Resolver um critério que se repete rende mais que ganhar um edital: melhora a nota de todos os próximos.`,
      evidencias: [
        `${d.fraco} avaliação(ões) abaixo de 50 e ${d.ausente} sem dado nenhum`,
        `Editais afetados somam ${fmtMi(d.valor)}`,
        `Ganho estimado de valor esperado ao resolver: ${fmtMi(d.ganho)}`,
      ],
      recomendacao: d.ausente > d.fraco
        ? 'Antes de investir: preencher o dado. Boa parte da perda aqui é falta de informação, não falta de capacidade.'
        : 'Tratar como investimento de capacidade, com retorno medido em probabilidade nas próximas disputas.',
      valorEmJogo: d.ganho,
      amostra: d.fraco + d.ausente,
    })
  }

  /* ---------- 4. Aglomeração de prazos ---------- */
  const semanas = new Map<number, Linha[]>()
  for (const l of abertas) {
    if ((l.a.diasRestantes ?? 0) > 90) continue
    const sem = Math.floor((l.a.diasRestantes ?? 0) / 7)
    semanas.set(sem, [...(semanas.get(sem) ?? []), l])
  }
  const gargalo = [...semanas.entries()].filter(([, ls]) => ls.length >= 3).sort((x, y) => x[0] - y[0])[0]
  if (gargalo) {
    const [sem, ls] = gargalo
    achados.push({
      id: 'gargalo-prazo',
      tipo: 'Gargalo operacional',
      severidade: 'atencao',
      titulo: `${ls.length} propostas vencem na mesma semana`,
      detalhe: `Entre ${sem * 7} e ${sem * 7 + 6} dias a equipe precisa fechar ${ls.length} propostas ao mesmo tempo. `
        + `Concorrência interna por atenção costuma custar mais editais do que concorrência externa.`,
      evidencias: ls.map((l) => `${l.o.titulo} — ${(l.a.diasRestantes ?? 0)} dias, ${fmtMi(l.o.valor)}`),
      recomendacao: 'Priorizar por valor esperado e decidir agora qual vai receber menos esforço — ou antecipar a preparação de uma delas.',
      valorEmJogo: ls.reduce((s, l) => s + l.o.valor * l.a.probabilidade.p, 0),
      amostra: ls.length,
    })
  }

  /* ---------- 5. Bloqueio por parceiro local ---------- */
  const bloqueadas = abertas.filter(({ o }) => {
    const local = o.componentesAderencia.find((c) => c.id === 'local')
    return o.exigeParceiroLocal && (local?.score ?? 0) < 60
  })
  if (bloqueadas.length >= 2) {
    const valor = bloqueadas.reduce((s, { o }) => s + o.valor, 0)
    achados.push({
      id: 'bloqueio-local',
      tipo: 'Barreira de entrada',
      severidade: 'critico',
      titulo: `${fmtMi(valor)} presos por falta de parceiro local`,
      detalhe: `${bloqueadas.length} editais exigem presença ou consórcio local e a empresa não atende. `
        + `Não é uma disputa perdida por preço nem por técnica: é uma porta fechada antes da proposta.`,
      evidencias: bloqueadas.map((l) => `${paisPorId(l.o.paisId).nome} — ${l.o.titulo} (${fmtMi(l.o.valor)})`),
      recomendacao: 'Prospectar um parceiro por país de interesse é a ação de maior retorno da carteira — destrava valor sem custo de produto.',
      valorEmJogo: valor,
      amostra: bloqueadas.length,
    })
  }

  /* ---------- 6. Custo da informação faltante ---------- */
  const semDado = abertas.filter(({ a }) => a.aderencia.confianca < 70)
  if (semDado.length >= 2) {
    const valor = semDado.reduce((s, { o, a }) => s + o.valor * a.probabilidade.p, 0)
    achados.push({
      id: 'confianca-baixa',
      tipo: 'Qualidade do dado',
      severidade: 'atencao',
      titulo: `${semDado.length} decisões apoiadas em dado incompleto`,
      detalhe: `Nestes editais menos de 70% dos critérios têm informação. A nota existe, mas a confiança dela é baixa — `
        + `decidir aqui é apostar, não analisar.`,
      evidencias: semDado.map((l) => `${l.o.titulo} — confiança ${l.a.aderencia.confianca}%, faltam: ${l.a.aderencia.ausentes.map((c) => c.label).join(', ') || '—'}`),
      recomendacao: 'Completar o cadastro dos critérios ausentes antes da reunião de decisão. É a correção mais barata do sistema.',
      valorEmJogo: valor,
      amostra: semDado.length,
    })
  }

  /* ---------- 7. Padrão de vitória (só com amostra suficiente) ---------- */
  const ganhas = linhas.filter(({ o }) => o.etapa === 'vencida')
  const perdidas = linhas.filter(({ o }) => o.etapa === 'perdida')
  if (ganhas.length + perdidas.length >= 5) {
    const med = (ls: Linha[]) => ls.reduce((s, l) => s + l.a.aderencia.nota, 0) / (ls.length || 1)
    const dif = med(ganhas) - med(perdidas)
    achados.push({
      id: 'padrao-vitoria',
      tipo: 'Padrão histórico',
      severidade: 'informativo',
      titulo: `Editais ganhos tinham aderência ${dif >= 0 ? dif.toFixed(0) + ' pontos maior' : Math.abs(dif).toFixed(0) + ' pontos menor'}`,
      detalhe: 'Comparação entre o que foi ganho e o que foi perdido — é o começo da calibração do modelo com dado real da empresa.',
      evidencias: [
        `Ganhas: ${ganhas.length}, aderência média ${med(ganhas).toFixed(0)}`,
        `Perdidas: ${perdidas.length}, aderência média ${med(perdidas).toFixed(0)}`,
      ],
      recomendacao: 'Com 20+ disputas fechadas, estes pesos deixam de ser estimados e passam a ser calibrados no histórico.',
      amostra: ganhas.length + perdidas.length,
    })
  } else if (perfil.historicoPropostas > 0) {
    achados.push({
      id: 'amostra-insuficiente',
      tipo: 'Padrão histórico',
      severidade: 'informativo',
      titulo: 'Ainda não há histórico suficiente para calibrar o modelo',
      detalhe: `Só ${ganhas.length + perdidas.length} disputa(s) fechada(s) dentro do sistema. `
        + 'Abaixo de 5 casos, qualquer padrão de vitória seria ruído apresentado como descoberta.',
      evidencias: [`Histórico declarado no perfil: ${perfil.historicoVitorias} vitórias em ${perfil.historicoPropostas} propostas`],
      recomendacao: 'Registrar as disputas fechadas — cada decisão registrada melhora a probabilidade das seguintes.',
      amostra: ganhas.length + perdidas.length,
    })
  }

  const ordem: Record<Severidade, number> = { critico: 0, atencao: 1, oportunidade: 2, informativo: 3 }
  return achados.sort((x, y) => ordem[x.severidade] - ordem[y.severidade] || (y.valorEmJogo ?? 0) - (x.valorEmJogo ?? 0))
}

function fmtMi(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

export const CORES_SEVERIDADE: Record<Severidade, string> = {
  critico: 'var(--danger)',
  atencao: 'var(--amber)',
  oportunidade: 'var(--teal)',
  informativo: 'var(--tx2)',
}

export const ROTULO_SEVERIDADE: Record<Severidade, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  oportunidade: 'Oportunidade',
  informativo: 'Informativo',
}
