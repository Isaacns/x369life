/* Casos de leitura de medida em texto de edital.
   Roda com:  npm run testar

   Não há runner no projeto ainda; este arquivo é executável direto por tsx.
   Cada caso aqui saiu de um jeito real de escrever exigência em edital — e
   os quatro primeiros são os que a revisão pegou produzindo veredito errado.
   Um ✓ ATENDE falso em critério eliminatório custa a proposta inteira. */
import { lerMedida, type Unidade } from './medida'

const CASOS: [string, Unidade, number | null][] = [
  // O achado: "70" de L70 virava a exigência de vida útil
  ['L70 > 100.000h', 'h', 100000],
  ['L80 ≥ 60.000 horas', 'h', 60000],
  ['IP66', 'h', null],
  ['IK10', '', null],

  // Unidade convertida, não ignorada
  ['garantia mínima de 10 anos', 'meses', 120],
  ['garantia de 60 meses', 'meses', 60],
  ['0,15 kW', 'W', 150],

  // Separador de milhar: brasileiro e anglófono
  ['1.500 lm', 'lm', 1500],
  ['1,500 lm', 'lm', 1500],
  ['1.234,56 lm', 'lm', 1234.56],

  // Faixa não é um valor
  ['60 a 100 W', 'W', null],
  ['de 3000 a 4000 K', 'K', null],
  ['entre 3.000 e 5.000 K', 'K', null],

  // Casos diretos
  ['mínimo de 130 lm/W', 'lm/W', 130],
  ['potência máxima 150 W', 'W', 150],
  ['4000K', 'K', 4000],
  ['IRC mínimo 70', '', 70],
  ['', 'W', null],

  // Unidade divergente: recusa em vez de comparar grandezas diferentes
  ['30 dias', 'un.', null],
]

let ok = 0
const falhas: string[] = []
for (const [texto, unidade, esperado] of CASOS) {
  const lido = lerMedida(texto, unidade)?.valor ?? null
  if (lido === esperado) ok++
  else falhas.push(`  "${texto}" [${unidade || 'sem unidade'}] → ${lido}, esperado ${esperado}`)
}

console.log(`medida: ${ok}/${CASOS.length} casos`)
if (falhas.length) {
  console.error('falhas:\n' + falhas.join('\n'))
  process.exit(1)
}
