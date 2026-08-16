/* Navegação da aplicação. Estado simples e explícito — a tela de
   oportunidade é um "detalhe" que qualquer módulo pode abrir (o dashboard
   abre direto do gráfico, o pipeline abre do cartão). */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { NavId } from '../app.config'

interface Estado {
  view: NavId
  oportunidadeId: string | null
  ir: (v: NavId) => void
  abrirOportunidade: (id: string) => void
  fecharOportunidade: () => void
}

const Ctx = createContext<Estado | null>(null)
export function useNavegacao() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNavegacao fora do NavegacaoProvider')
  return v
}

export function NavegacaoProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<NavId>('visao')
  const [oportunidadeId, setOportunidadeId] = useState<string | null>(null)

  const valor = useMemo<Estado>(() => ({
    view, oportunidadeId,
    ir: (v) => { setView(v); setOportunidadeId(null) },
    abrirOportunidade: (id) => { setView('oportunidades'); setOportunidadeId(id) },
    fecharOportunidade: () => setOportunidadeId(null),
  }), [view, oportunidadeId])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
