import { APP } from '../app.config'

/* ============================================================
   Marca do X369life.
   O símbolo é uma malha 3×3 de pontos — um parque de iluminação
   reduzido a nove pontos — com a diagonal acesa em âmbar. Âmbar
   porque é a cor do vapor de sódio que a modernização LED
   substitui: a diagonal acesa é literalmente o que o produto
   ajuda a trocar.
   ============================================================ */

const ACESOS = new Set(['0,0', '1,1', '2,2'])

export function Simbolo({ tamanho = 32, sobreEscuro = false }: { tamanho?: number; sobreEscuro?: boolean }) {
  const pontos: React.ReactNode[] = []
  for (let l = 0; l < 3; l++) {
    for (let c = 0; c < 3; c++) {
      const aceso = ACESOS.has(`${l},${c}`)
      pontos.push(
        <circle key={`${l}-${c}`} cx={9 + c * 7} cy={9 + l * 7} r={2.4}
          fill={aceso ? '#E0A93C' : sobreEscuro ? '#4A90D9' : 'var(--brand)'} />,
      )
    }
  }
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" role="img" aria-label={APP.nome}>
      <rect width="32" height="32" rx="8" fill={sobreEscuro ? '#12293F' : 'var(--navy)'} />
      {pontos}
    </svg>
  )
}

export function Marca({ tamanho = 32, sobreEscuro = false, comNome = true }:
{ tamanho?: number; sobreEscuro?: boolean; comNome?: boolean }) {
  return (
    <span className="x-logo">
      <Simbolo tamanho={tamanho} sobreEscuro={sobreEscuro} />
      {comNome && <b>{APP.marca}<i>{APP.sufixo}</i></b>}
    </span>
  )
}
