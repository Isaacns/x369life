import { useMemo, useState, type DragEvent } from 'react'
import { MODO_DEMO } from '../app.config'
import { comPesos, useDados } from '../lib/dados'
import { paisPorId } from '../lib/demo'
import { avaliar } from '../lib/scoring'
import { ETAPAS, type EtapaPipeline } from '../lib/tipos'
import { corPrazo, moeda, rotuloPrazo } from '../lib/formato'
import { FaixaDemo, Stat, useToast } from '../ui/kit'
import { useNavegacao } from '../ui/navegacao'

/* §15 dos padrões VIZIO — arrastar-e-soltar HTML5 nativo com tipo próprio.
   No dragover o dataTransfer está protegido: decide-se aceitar pela lista
   `types`, e só se lê `getData` no drop. */
const TIPO = 'text/x-x369-oportunidade'
const temNossoTipo = (e: DragEvent) =>
  Array.prototype.indexOf.call(e.dataTransfer.types, TIPO) >= 0

export default function Pipeline() {
  const { oportunidades, perfilOrg, pesos, moverEtapa } = useDados()
  const { abrirOportunidade } = useNavegacao()
  const toast = useToast()
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [alvo, setAlvo] = useState<EtapaPipeline | null>(null)

  const linhas = useMemo(
    () => oportunidades.map((o) => ({ o, a: avaliar(comPesos(o, pesos), perfilOrg) })),
    [oportunidades, perfilOrg, pesos],
  )

  const emAndamento = linhas.filter(({ o }) => !['vencida', 'perdida', 'descartada'].includes(o.etapa))
  const valorTotal = emAndamento.reduce((s, { o }) => s + o.valor, 0)
  const valorPonderado = emAndamento.reduce((s, { o, a }) => s + o.valor * a.probabilidade.p, 0)
  const ganhas = linhas.filter(({ o }) => o.etapa === 'vencida')
  const perdidas = linhas.filter(({ o }) => o.etapa === 'perdida')
  const taxa = ganhas.length + perdidas.length > 0
    ? Math.round((ganhas.length / (ganhas.length + perdidas.length)) * 100) : null

  function soltar(e: DragEvent, etapa: EtapaPipeline) {
    e.preventDefault()
    setAlvo(null); setArrastando(null)
    const id = e.dataTransfer.getData(TIPO) || e.dataTransfer.getData('text/plain').replace('op:', '')
    if (!id) return
    const atual = oportunidades.find((o) => o.id === id)
    if (!atual || atual.etapa === etapa) return       // soltar no mesmo lugar não faz nada
    moverEtapa(id, etapa)
    toast(`Movida para “${ETAPAS.find((x) => x.id === etapa)?.label}”.`)
  }

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h">
        <h1>Pipeline comercial</h1>
        <p>Arraste o cartão para mudar a etapa — ou use o seletor dentro da oportunidade.</p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 18 }}>
        <Stat rotulo="Em andamento" valor={emAndamento.length} sub="oportunidades ativas" />
        <Stat rotulo="Valor total" valor={moeda(valorTotal, 'BRL', true)} sub="se tudo fosse ganho" />
        <Stat rotulo="Valor ponderado" valor={moeda(valorPonderado, 'BRL', true)}
          sub="pela probabilidade de cada uma" cor="var(--brand)" />
        <Stat rotulo="Taxa de vitória" valor={taxa === null ? '—' : `${taxa}%`}
          sub={taxa === null ? 'sem histórico fechado' : `${ganhas.length} ganhas · ${perdidas.length} perdidas`}
          cor={taxa !== null && taxa >= 30 ? 'var(--teal)' : undefined} />
      </div>

      <div className="kanban">
        {ETAPAS.map((etapa) => {
          const doGrupo = linhas.filter(({ o }) => o.etapa === etapa.id)
          const soma = doGrupo.reduce((s, { o }) => s + o.valor, 0)
          return (
            <div key={etapa.id} className="kb-col"
              onDragOver={(e) => { if (temNossoTipo(e)) { e.preventDefault(); setAlvo(etapa.id) } }}
              onDragLeave={() => setAlvo((v) => (v === etapa.id ? null : v))}
              onDrop={(e) => soltar(e, etapa.id)}
              style={alvo === etapa.id
                ? { outline: '2px dashed var(--brand)', outlineOffset: 2, background: 'var(--brand-soft)' }
                : undefined}>
              <h3>
                <span>{etapa.label}</span>
                <span>{doGrupo.length}</span>
              </h3>
              {soma > 0 && (
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 8, marginTop: -4 }}>
                  {moeda(soma, 'BRL', true)}
                </div>
              )}
              {doGrupo.map(({ o, a }) => (
                <div key={o.id} className="kb-card" draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(TIPO, o.id)
                    e.dataTransfer.setData('text/plain', `op:${o.id}`)   // reserva: alguns navegadores só entregam text/plain
                    e.dataTransfer.effectAllowed = 'move'
                    setArrastando(o.id)
                  }}
                  onDragEnd={() => { setArrastando(null); setAlvo(null) }}
                  onClick={() => abrirOportunidade(o.id)}
                  style={arrastando === o.id ? { opacity: .45, cursor: 'grabbing' } : { cursor: 'grab' }}>
                  <b>{paisPorId(o.paisId).bandeira} {o.titulo}</b>
                  <div className="m">
                    <span>{moeda(o.valor, o.moeda, true)}</span>
                    <span style={{ color: corPrazo(a.diasRestantes) }}>{rotuloPrazo(a.diasRestantes)}</span>
                  </div>
                  <div className="m">
                    <span>aderência {a.aderencia.nota}</span>
                    <span><b>{Math.round(a.probabilidade.p * 100)}%</b></span>
                  </div>
                </div>
              ))}
              {doGrupo.length === 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--tx3)', textAlign: 'center', padding: '14px 6px' }}>
                  vazia
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
