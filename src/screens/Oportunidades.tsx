import { useMemo, useState } from 'react'
import { MODO_DEMO } from '../app.config'
import { Erro } from '../ui/kit'
import { comPesos, useDados } from '../lib/dados'
import { paisPorId, PAISES } from '../lib/demo'
import { avaliar } from '../lib/scoring'
import { ETAPAS, type Oportunidade } from '../lib/tipos'
import { corAderencia, corPrazo, corRisco, moeda, data as fData, rotuloPrazo } from '../lib/formato'
import { Badge, Barra, Carregando, FaixaDemo, Vazio } from '../ui/kit'
import { useNavegacao } from '../ui/navegacao'
import DetalheOportunidade from './Oportunidade'
import NovaOportunidade from './NovaOportunidade'

type Vista = 'tabela' | 'cards'

export default function Oportunidades() {
  const { oportunidades, perfilOrg, pesos, carregando, erro, recarregar,
          semearDemonstrativos } = useDados()
  const [cadastrando, setCadastrando] = useState(false)
  const [semeando, setSemeando] = useState(false)
  const { oportunidadeId, abrirOportunidade } = useNavegacao()

  const [vista, setVista] = useState<Vista>('tabela')
  const [busca, setBusca] = useState('')
  const [pais, setPais] = useState('')
  const [etapa, setEtapa] = useState('')
  const [aderenciaMin, setAderenciaMin] = useState(0)
  const [soAbertas, setSoAbertas] = useState(true)

  const linhas = useMemo(() => oportunidades
    .map((o) => ({ o, a: avaliar(comPesos(o, pesos), perfilOrg) }))
    .filter(({ o, a }) => {
      if (soAbertas && ((a.diasRestantes !== null && a.diasRestantes <= 0)
        || ['vencida', 'perdida', 'descartada'].includes(o.etapa))) return false
      if (pais && o.paisId !== pais) return false
      if (etapa && o.etapa !== etapa) return false
      if (a.aderencia.nota < aderenciaMin) return false
      if (busca) {
        const t = `${o.titulo} ${o.comprador} ${o.produtos.join(' ')}`.toLowerCase()
        if (!t.includes(busca.toLowerCase())) return false
      }
      return true
    })
    // Sem prazo vai para o fim da fila, não para o começo.
    .sort((x, y) => (x.a.diasRestantes ?? Infinity) - (y.a.diasRestantes ?? Infinity)),
  [oportunidades, perfilOrg, pesos, busca, pais, etapa, aderenciaMin, soAbertas])

  if (oportunidadeId) return <DetalheOportunidade id={oportunidadeId} />

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h" style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>Central de oportunidades</h1>
          <p>{linhas.length} de {oportunidades.length} oportunidades nos filtros atuais.</p>
        </div>
        <button className="b nao-imprime" onClick={() => setCadastrando(true)}>+ Cadastrar edital</button>
      </div>

      {erro && <div style={{ marginBottom: 14 }}><Erro texto={erro} onTentar={() => void recarregar()} /></div>}

      <div className="card card-p nao-imprime" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="inp" placeholder="Buscar por objeto, comprador ou produto…"
            value={busca} onChange={(e) => setBusca(e.target.value)}
            style={{ flex: '1 1 240px', height: 36, minWidth: 200 }} aria-label="Buscar" />
          <select className="inp" value={pais} onChange={(e) => setPais(e.target.value)}
            style={{ width: 'auto', height: 36, fontSize: 13 }} aria-label="País">
            <option value="">Todos os países</option>
            {PAISES.map((p) => <option key={p.id} value={p.id}>{p.bandeira} {p.nome}</option>)}
          </select>
          <select className="inp" value={etapa} onChange={(e) => setEtapa(e.target.value)}
            style={{ width: 'auto', height: 36, fontSize: 13 }} aria-label="Etapa">
            <option value="">Todas as etapas</option>
            {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--tx2)' }}>
            Aderência ≥ <b style={{ color: corAderencia(aderenciaMin), minWidth: 22 }}>{aderenciaMin}</b>
            <input type="range" min={0} max={100} step={5} value={aderenciaMin}
              onChange={(e) => setAderenciaMin(Number(e.target.value))} style={{ width: 96 }} aria-label="Aderência mínima" />
          </label>
          <button className={'chip' + (soAbertas ? ' on' : '')} onClick={() => setSoAbertas((s) => !s)}>
            Só as abertas
          </button>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={'chip' + (vista === 'tabela' ? ' on' : '')} onClick={() => setVista('tabela')}>Tabela</button>
            <button className={'chip' + (vista === 'cards' ? ' on' : '')} onClick={() => setVista('cards')}>Cartões</button>
          </div>
        </div>
      </div>

      {carregando ? <Carregando /> : oportunidades.length === 0 ? (
        <Vazio ico="◎" titulo="Nenhum edital cadastrado ainda"
          texto="Cadastre o primeiro edital à mão, ou carregue o conjunto demonstrativo para ver o sistema com carteira cheia — ele fica marcado como demonstrativo e pode ser removido depois.">
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="b" onClick={() => setCadastrando(true)}>Cadastrar edital</button>
            <button className="b-ghost" disabled={semeando} onClick={() => {
              setSemeando(true)
              void semearDemonstrativos().finally(() => setSemeando(false))
            }}>{semeando ? 'Carregando…' : 'Carregar conjunto demonstrativo'}</button>
          </div>
        </Vazio>
      ) : linhas.length === 0 ? (
        <Vazio titulo="Nada encontrado" texto="Nenhuma oportunidade atende a esta combinação de filtros. Tente ampliar o critério de aderência ou incluir as encerradas." />
      ) : vista === 'tabela' ? (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Objeto</th><th>País</th><th>Valor</th><th>Prazo</th>
                  <th>Aderência</th><th>Risco</th><th>Chance</th><th>Etapa</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ o, a }) => (
                  <tr key={o.id} onClick={() => abrirOportunidade(o.id)}>
                    <td data-l="Objeto">
                      <b style={{ fontWeight: 600, display: 'block', lineHeight: 1.35 }}>{o.titulo}</b>
                      <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>{o.comprador}</span>
                    </td>
                    <td data-l="País">{paisPorId(o.paisId).bandeira} {paisPorId(o.paisId).nome}</td>
                    <td data-l="Valor"><b style={{ fontWeight: 600 }}>{moeda(o.valor, o.moeda, true)}</b></td>
                    <td data-l="Prazo">
                      <span style={{ color: corPrazo(a.diasRestantes), fontWeight: 600 }}>{rotuloPrazo(a.diasRestantes)}</span>
                      <span style={{ fontSize: 11, color: 'var(--tx3)', display: 'block' }}>{fData(o.prazo)}</span>
                    </td>
                    <td data-l="Aderência" style={{ minWidth: 110 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <b style={{ color: corAderencia(a.aderencia.nota), fontWeight: 700 }}>{a.aderencia.nota}</b>
                        <div style={{ flex: 1, minWidth: 44 }}><Barra valor={a.aderencia.nota} cor={corAderencia(a.aderencia.nota)} altura={5} /></div>
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>confiança {a.aderencia.confianca}%</span>
                    </td>
                    <td data-l="Risco"><Badge cor={corRisco(a.risco.nivel)}>{a.risco.nivel}</Badge></td>
                    <td data-l="Chance"><b style={{ fontWeight: 700 }}>{Math.round(a.probabilidade.p * 100)}%</b></td>
                    <td data-l="Etapa">
                      <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{ETAPAS.find((e) => e.id === o.etapa)?.label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
          {linhas.map(({ o, a }) => <Cartao key={o.id} o={o} a={a} onAbrir={() => abrirOportunidade(o.id)} />)}
        </div>
      )}

      {cadastrando && <NovaOportunidade onFechar={() => setCadastrando(false)} />}
    </>
  )
}

function Cartao({ o, a, onAbrir }: { o: Oportunidade; a: ReturnType<typeof avaliar>; onAbrir: () => void }) {
  const p = paisPorId(o.paisId)
  return (
    <button className="card card-p" onClick={onAbrir}
      style={{ textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--tx)', display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{p.bandeira} {p.nome}</span>
        <Badge cor={corRisco(a.risco.nivel)}>risco {a.risco.nivel}</Badge>
      </div>
      <b style={{ fontSize: 14, fontWeight: 600, display: 'block', lineHeight: 1.4, marginBottom: 4 }}>{o.titulo}</b>
      <span style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 12 }}>{o.comprador}</span>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <b style={{ fontSize: 18, fontWeight: 700 }}>{moeda(o.valor, o.moeda, true)}</b>
        <span style={{ fontSize: 12, color: corPrazo(a.diasRestantes), fontWeight: 600 }}>{rotuloPrazo(a.diasRestantes)}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--tx2)', marginBottom: 5 }}>
        <span>Aderência <b style={{ color: corAderencia(a.aderencia.nota) }}>{a.aderencia.nota}</b> · confiança {a.aderencia.confianca}%</span>
        <span>chance <b>{Math.round(a.probabilidade.p * 100)}%</b></span>
      </div>
      <Barra valor={a.aderencia.nota} cor={corAderencia(a.aderencia.nota)} altura={5} />

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--tx2)' }}>
        {a.recomendacao.titulo}
      </div>
    </button>
  )
}
