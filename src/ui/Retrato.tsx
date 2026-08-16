import { iniciais } from '../lib/formato'

/* Retrato da pessoa: foto quando existe, iniciais quando não.
   Mesma peça no topo (34px) e na ficha "Meu perfil" (76px). */
export function Retrato({ nome, url, tamanho = 34 }:
{ nome: string; url?: string | null; tamanho?: number }) {
  const estilo: React.CSSProperties = { width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.36) }
  if (url) {
    return <img className="av" src={url} alt={`Foto de ${nome}`} style={estilo} />
  }
  return <span className="av" aria-hidden style={estilo}>{iniciais(nome)}</span>
}
