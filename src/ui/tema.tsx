/* Tema claro + escuro (§4 dos padrões VIZIO), persistido no aparelho.
   Também entrega a paleta em hexadecimal para os gráficos — Recharts não
   lê variável CSS, e gráfico com cor errada no tema escuro é bug visual. */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Tema = 'claro' | 'escuro'

export interface Cores {
  brand: string; teal: string; amber: string; danger: string
  grid: string; texto: string; suave: string
  serie: string[]
}

const PALETA: Record<Tema, Cores> = {
  claro: {
    brand: '#1B5A96', teal: '#0E9384', amber: '#B4790E', danger: '#B42318',
    grid: '#E3E9F0', texto: '#55657A', suave: '#F6F8FB',
    serie: ['#1B5A96', '#0E9384', '#B4790E', '#5A7CA8', '#B42318', '#2E6FB8'],
  },
  escuro: {
    brand: '#4A90D9', teal: '#2CB5A0', amber: '#D9A441', danger: '#E5705F',
    grid: 'rgba(148,171,196,.18)', texto: '#97A8BC', suave: '#0C1B2B',
    serie: ['#4A90D9', '#2CB5A0', '#D9A441', '#7FA6CC', '#E5705F', '#6FB1E8'],
  },
}

interface Estado { tema: Tema; alternar: () => void; cores: Cores }
const Ctx = createContext<Estado | null>(null)

export function useTema() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTema fora do TemaProvider')
  return v
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(
    () => (localStorage.getItem('x369_tema') as Tema | null) ?? 'claro',
  )
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema === 'escuro' ? 'dark' : 'light')
    localStorage.setItem('x369_tema', tema)
  }, [tema])

  const valor = useMemo<Estado>(() => ({
    tema, cores: PALETA[tema],
    alternar: () => setTema((t) => (t === 'claro' ? 'escuro' : 'claro')),
  }), [tema])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
