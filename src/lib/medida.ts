/* ============================================================
   Leitura de medida em texto livre de edital.

   A versão anterior pegava o primeiro número da string. Isso produzia
   veredito ERRADO em critério eliminatório — o caso que a revisão encontrou:

     "L70 > 100.000h"  →  70        (o "70" de L70)
     produto com 50.000 h  →  50000 >= 70  →  ✓ ATENDE

   Um comparador que erra assim é pior que comparador nenhum: ele dá
   confiança onde não há informação, e a proposta é desclassificada depois.

   A regra aqui é: na dúvida, NÃO responde. `null` vira "não extraído" na
   tela, que é honesto. Chutar um número com evidência e página ao lado dá
   ao chute a aparência de rigor.
   ============================================================ */

export type Unidade = 'W' | 'lm' | 'lm/W' | 'K' | 'h' | 'meses' | 'un.' | ''

/** Sinônimos aceitos por unidade, e o fator para a unidade canônica. */
const EQUIVALENTES: Record<string, { unidade: Unidade; fator: number }> = {
  w: { unidade: 'W', fator: 1 },
  watt: { unidade: 'W', fator: 1 }, watts: { unidade: 'W', fator: 1 },
  kw: { unidade: 'W', fator: 1000 },
  lm: { unidade: 'lm', fator: 1 },
  lumen: { unidade: 'lm', fator: 1 }, lumens: { unidade: 'lm', fator: 1 },
  'lm/w': { unidade: 'lm/W', fator: 1 },
  k: { unidade: 'K', fator: 1 }, kelvin: { unidade: 'K', fator: 1 },
  h: { unidade: 'h', fator: 1 }, hora: { unidade: 'h', fator: 1 }, horas: { unidade: 'h', fator: 1 },
  mes: { unidade: 'meses', fator: 1 }, meses: { unidade: 'meses', fator: 1 },
  ano: { unidade: 'meses', fator: 12 }, anos: { unidade: 'meses', fator: 12 },
  un: { unidade: 'un.', fator: 1 }, unidade: { unidade: 'un.', fator: 1 },
  unidades: { unidade: 'un.', fator: 1 }, pecas: { unidade: 'un.', fator: 1 },
}

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/* Converte o texto de um número para valor, decidindo separador decimal.
   "100.000" → 100000 (milhar) · "1,5" → 1.5 · "1,500" → 1500 (milhar)
   "1.234,56" → 1234.56 · "1,234.56" → 1234.56 */
function paraNumero(bruto: string): number | null {
  const temPonto = bruto.includes('.')
  const temVirgula = bruto.includes(',')
  let s = bruto

  if (temPonto && temVirgula) {
    // O separador decimal é o que aparece por último.
    const decimal = bruto.lastIndexOf(',') > bruto.lastIndexOf('.') ? ',' : '.'
    const milhar = decimal === ',' ? '.' : ','
    s = bruto.split(milhar).join('').replace(decimal, '.')
  } else if (temPonto || temVirgula) {
    const sep = temPonto ? '.' : ','
    const partes = bruto.split(sep)
    // Grupos de exatamente 3 dígitos depois do primeiro → separador de milhar.
    const ehMilhar = partes.length > 1 && partes.slice(1).every((p) => /^\d{3}$/.test(p))
    s = ehMilhar ? partes.join('') : bruto.replace(sep, '.')
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export interface Medida { valor: number; unidade: Unidade }

/**
 * Lê uma medida do texto, exigindo que ela case com a unidade esperada.
 * Devolve `null` sempre que houver ambiguidade — faixa, unidade divergente,
 * número colado em letra (L70, IP66) ou nenhuma unidade quando ela é exigida.
 */
export function lerMedida(texto: string, esperada: Unidade): Medida | null {
  if (!texto) return null
  const t = semAcento(texto)

  // Faixa não é um valor só. Três formas: "60 a 100 W", "60-100W" e
  // "entre 3.000 e 5.000 K" — esta última escapou na primeira versão, e
  // devolvia o limite superior como se fosse a exigência.
  if (/\d\s*(?:a|ate|-|–|—|~)\s*\d/.test(t)) return null
  if (t.includes('entre') && (t.match(/\d+(?:[.,]\d+)*/g) ?? []).length >= 2) return null

  // Números NÃO colados a letra imediatamente antes. É isso que descarta o
  // "70" de "L70", o "66" de "IP66" e o "08" de "IK08".
  const achados: Medida[] = []
  const re = /(^|[^a-z0-9])(\d+(?:[.,]\d+)*)\s*([a-z/µ]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t)) !== null) {
    const valor = paraNumero(m[2])
    if (valor === null) continue
    const sufixo = m[3].replace(/\.$/, '')
    const eq = EQUIVALENTES[sufixo]
    if (sufixo && !eq) continue                     // unidade que não conhecemos
    achados.push(eq
      ? { valor: valor * eq.fator, unidade: eq.unidade }
      : { valor, unidade: '' })
  }
  if (achados.length === 0) return null

  // Com unidade explícita batendo com a esperada, é ela — mesmo que venha
  // depois de outro número no texto.
  const comUnidade = achados.filter((a) => a.unidade === esperada && esperada !== '')
  if (comUnidade.length === 1) return comUnidade[0]
  if (comUnidade.length > 1) return null            // mais de um candidato: ambíguo

  // Nenhum casou. Se o texto declara OUTRA unidade conhecida, o campo não é
  // o que pensávamos — recusa em vez de comparar grandezas diferentes.
  if (achados.some((a) => a.unidade !== '' && a.unidade !== esperada)) return null

  // Só números sem unidade: aceita quando há exatamente um.
  const semUnidade = achados.filter((a) => a.unidade === '')
  return semUnidade.length === 1 ? { valor: semUnidade[0].valor, unidade: esperada } : null
}
