import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { MODO_DEMO } from '../app.config'
import { comPesos, useDados } from '../lib/dados'
import { paisPorId } from '../lib/demo'
import { avaliar, criticidade, type Avaliacao } from '../lib/scoring'
import { ETAPAS, type Oportunidade } from '../lib/tipos'
import { corAderencia, corPrazo, corRisco, moeda, rotuloPrazo } from '../lib/formato'
import { Badge, Barra, FaixaDemo, Stat, Vazio } from '../ui/kit'
import { useNavegacao } from '../ui/navegacao'
import { useTema } from '../ui/tema'

interface Linha { o: Oportunidade; a: Avaliacao }

const ENCERRADAS = ['vencida', 'perdida', 'descartada']

export default function Visao() {
  const { oportunidades, perfilOrg, pesos } = useDados()
  const { abrirOportunidade } = useNavegacao()
  const { cores } = useTema()

  const [pais, setPais] = useState<string | null>(null)
  const [janela, setJanela] = useState<number | null>(90)
  const [responsavel, setResponsavel] = useState<string>('')

  const todas = useMemo<Linha[]>(
    () => oportunidades.map((o) => ({ o, a: avaliar(comPesos(o, pesos), perfilOrg) })),
    [oportunidades, perfilOrg, pesos],
  )

  const linhas = useMemo(() => todas.filter(({ o, a }) => {
    if (pais && o.paisId !== pais) return false
    if (responsavel && o.responsavel !== responsavel) return false
    if (janela !== null && a.diasRestantes > janela) return false
    return true
  }), [todas, pais, janela, responsavel])

  const abertas = linhas.filter(({ o, a }) => !ENCERRADAS.includes(o.etapa) && a.diasRestantes > 0)

  /* ---------- indicadores ---------- */
  const valorPipeline = abertas.reduce((s, { o }) => s + o.valor, 0)
  const valorPonderado = abertas.reduce((s, { o, a }) => s + o.valor * a.probabilidade.p, 0)
  const qualificadas = abertas.filter(({ a }) => a.aderencia.nota >= 70 && a.aderencia.confianca >= 60)
  const aderenciaMedia = abertas.length
    ? Math.round(abertas.reduce((s, { a }) => s + a.aderencia.nota, 0) / abertas.length) : 0
  const confiancaMedia = abertas.length
    ? Math.round(abertas.reduce((s, { a }) => s + a.probabilidade.confianca, 0) / abertas.length) : 0
  const urgentes = abertas.filter(({ a }) => a.diasRestantes <= 15)

  /* ---------- prioridade de decisão: valor esperado ÷ tempo restante ----------
     É o coração do "decidir melhor": ordena pelo que mais custa perder se
     ficar parado — valor esperado alto e prazo curto sobem juntos.          */
  const prioridade = useMemo(() => abertas
    .map((l) => ({
      ...l,
      urgencia: (l.o.valor * l.a.probabilidade.p) / Math.max(3, l.a.diasRestantes),
    }))
    .sort((x, y) => y.urgencia - x.urgencia)
    .slice(0, 5), [abertas])

  /* ---------- gráficos ---------- */
  const porEtapa = ETAPAS.filter((e) => !ENCERRADAS.includes(e.id)).map((e) => ({
    nome: e.label.replace('Preparando proposta', 'Proposta').replace('Aguardando decisão', 'Decisão'),
    qtd: linhas.filter(({ o }) => o.etapa === e.id).length,
    valor: linhas.filter(({ o }) => o.etapa === e.id).reduce((s, { o }) => s + o.valor, 0),
  })).filter((e) => e.qtd > 0)

  const porPais = useMemo(() => {
    const mapa = new Map<string, { nome: string; bandeira: string; qtd: number; valor: number; id: string }>()
    for (const { o } of linhas) {
      const p = paisPorId(o.paisId)
      const at = mapa.get(o.paisId) ?? { nome: p.nome, bandeira: p.bandeira, qtd: 0, valor: 0, id: o.paisId }
      at.qtd += 1; at.valor += o.valor
      mapa.set(o.paisId, at)
    }
    return [...mapa.values()].sort((a, b) => b.valor - a.valor)
  }, [linhas])

  /* Mapa de decisão: aderência × probabilidade, tamanho = valor.
     O quadrante superior direito é onde se ganha dinheiro.                  */
  const mapa = abertas.map(({ o, a }) => ({
    x: a.aderencia.nota,
    y: Math.round(a.probabilidade.p * 100),
    z: o.valor,
    nome: o.titulo,
    id: o.id,
    risco: a.risco.nivel,
  }))

  /* Projeção: receita ponderada esperada por mês de fechamento do edital. */
  const projecao = useMemo(() => {
    const meses: { mes: string; esperado: number; bruto: number }[] = []
    const agora = new Date()
    for (let i = 0; i < 6; i++) {
      const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1)
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const doMes = abertas.filter(({ o }) => o.prazo.slice(0, 7) === chave)
      meses.push({
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        esperado: Math.round(doMes.reduce((s, { o, a }) => s + o.valor * a.probabilidade.p, 0)),
        bruto: doMes.reduce((s, { o }) => s + o.valor, 0),
      })
    }
    return meses
  }, [abertas])

  const riscosCriticos = abertas
    .flatMap(({ o, a }) => a.risco.criticos.map((r) => ({ r, o })))
    .sort((x, y) => criticidade(y.r) - criticidade(x.r))
    .slice(0, 4)

  const produtos = useMemo(() => {
    const m = new Map<string, number>()
    for (const { o } of abertas) for (const p of o.produtos) m.set(p, (m.get(p) ?? 0) + o.valor)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [abertas])

  const responsaveis = [...new Set(oportunidades.map((o) => o.responsavel))].filter((r) => r && r !== '—')

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h">
        <h1>Visão geral</h1>
        <p>Onde investir tempo agora — por valor esperado, prazo e confiança do dado.</p>
      </div>

      {/* ---------- filtros ---------- */}
      <div className="card card-p nao-imprime" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx2)', fontWeight: 600 }}>Prazo até</span>
          {[30, 90, 180, null].map((j) => (
            <button key={String(j)} className={'chip' + (janela === j ? ' on' : '')} onClick={() => setJanela(j)}>
              {j === null ? 'Todos' : `${j} dias`}
            </button>
          ))}
          <span style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
          <button className={'chip' + (pais === null ? ' on' : '')} onClick={() => setPais(null)}>Todos os países</button>
          {porPais.map((p) => (
            <button key={p.id} className={'chip' + (pais === p.id ? ' on' : '')} onClick={() => setPais(pais === p.id ? null : p.id)}>
              {p.bandeira} {p.nome}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <select className="inp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}
            style={{ width: 'auto', minWidth: 170, height: 34, fontSize: 13 }} aria-label="Responsável">
            <option value="">Todos os responsáveis</option>
            {responsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {abertas.length === 0 ? (
        <Vazio titulo="Nenhuma oportunidade nestes filtros"
          texto="Amplie a janela de prazo ou remova o filtro de país para ver o que existe na base." />
      ) : (
        <>
          {/* ---------- indicadores ---------- */}
          <div className="grid-stats" style={{ marginBottom: 16 }}>
            <Stat rotulo="Editais abertos" valor={abertas.length}
              sub={`${urgentes.length} com prazo em até 15 dias`} />
            <Stat rotulo="Qualificadas" valor={qualificadas.length}
              sub="aderência ≥ 70 com dado suficiente" cor="var(--teal)" />
            <Stat rotulo="Valor do pipeline" valor={moeda(valorPipeline, 'BRL', true)}
              sub="soma dos editais abertos" />
            <Stat rotulo="Valor ponderado" valor={moeda(valorPonderado, 'BRL', true)}
              sub={`pela probabilidade · confiança ${confiancaMedia}%`} cor="var(--brand)" />
            <Stat rotulo="Aderência média" valor={`${aderenciaMedia}`}
              sub="dos editais abertos" cor={corAderencia(aderenciaMedia)} />
          </div>

          {/* ---------- prioridade de decisão ---------- */}
          <div className="card card-p" style={{ marginBottom: 16 }}>
            <div className="sec-h">
              <h2>Decidir agora</h2>
              <span className="sub">ordenado por valor esperado dividido pelo tempo que resta</span>
            </div>
            {prioridade.map(({ o, a }) => (
              <button key={o.id} onClick={() => abrirOportunidade(o.id)}
                style={{
                  display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 14, width: '100%',
                  textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--line)',
                  padding: '12px 2px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--tx)',
                }}>
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 13.5, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {paisPorId(o.paisId).bandeira} {o.titulo}
                  </b>
                  <span style={{ fontSize: 12, color: 'var(--tx2)' }}>
                    {a.recomendacao.titulo} · {a.recomendacao.motivos[0]}
                  </span>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <b style={{ fontSize: 14, display: 'block' }}>{moeda(o.valor * a.probabilidade.p, o.moeda, true)}</b>
                  <span style={{ fontSize: 11.5, color: corPrazo(a.diasRestantes) }}>
                    {Math.round(a.probabilidade.p * 100)}% · {rotuloPrazo(a.diasRestantes)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* ---------- mapa de decisão + projeção ---------- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 14, marginBottom: 16 }}>
            <div className="card card-p">
              <div className="sec-h">
                <h2>Mapa de decisão</h2>
                <span className="sub">aderência × probabilidade · o tamanho é o valor</span>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart margin={{ top: 8, right: 12, bottom: 22, left: -14 }}>
                  <CartesianGrid stroke={cores.grid} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Aderência" domain={[0, 100]}
                    tick={{ fontSize: 11, fill: cores.texto }} stroke={cores.grid}
                    label={{ value: 'Aderência', position: 'insideBottom', offset: -12, fontSize: 11, fill: cores.texto }} />
                  <YAxis type="number" dataKey="y" name="Probabilidade" domain={[0, 100]} unit="%"
                    tick={{ fontSize: 11, fill: cores.texto }} stroke={cores.grid} />
                  <ZAxis type="number" dataKey="z" range={[60, 620]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<DicaMapa />} />
                  <Scatter data={mapa} onClick={(d) => {
                    const id = (d as unknown as { id?: string }).id
                    if (id) abrirOportunidade(id)
                  }}>
                    {mapa.map((m) => (
                      <Cell key={m.id} fill={corRisco(m.risco)} fillOpacity={0.55} stroke={corRisco(m.risco)} style={{ cursor: 'pointer' }} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '6px 0 0' }}>
                Canto superior direito = alta aderência e alta chance. A cor é o nível de risco.
              </p>
            </div>

            <div className="card card-p">
              <div className="sec-h">
                <h2>Projeção ponderada</h2>
                <span className="sub">por mês de fechamento do edital</span>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={projecao} margin={{ top: 8, right: 10, bottom: 4, left: -12 }}>
                  <defs>
                    <linearGradient id="gEsperado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cores.brand} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={cores.brand} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={cores.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: cores.texto }} stroke={cores.grid} />
                  <YAxis tickFormatter={(v: number) => moeda(v, 'BRL', true)}
                    tick={{ fontSize: 11, fill: cores.texto }} stroke={cores.grid} width={64} />
                  <Tooltip content={<DicaProjecao />} />
                  <Area type="monotone" dataKey="bruto" stroke={cores.grid} fill="none" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="esperado" stroke={cores.brand} strokeWidth={2} fill="url(#gEsperado)" />
                </AreaChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '6px 0 0' }}>
                Linha cheia: valor ponderado pela probabilidade. Tracejada: valor bruto, se tudo fosse ganho.
              </p>
            </div>
          </div>

          {/* ---------- etapa + país ---------- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 14, marginBottom: 16 }}>
            <div className="card card-p">
              <div className="sec-h"><h2>Oportunidades por etapa</h2></div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={porEtapa} margin={{ top: 4, right: 8, bottom: 4, left: -22 }}>
                  <CartesianGrid stroke={cores.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 10, fill: cores.texto }} stroke={cores.grid} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: cores.texto }} stroke={cores.grid} />
                  <Tooltip cursor={{ fill: cores.suave }} content={<DicaEtapa />} />
                  <Bar dataKey="qtd" fill={cores.brand} radius={[5, 5, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card card-p">
              <div className="sec-h">
                <h2>Países</h2>
                <span className="sub">clique para filtrar</span>
              </div>
              {porPais.map((p) => {
                const maxV = porPais[0]?.valor || 1
                return (
                  <button key={p.id} onClick={() => setPais(pais === p.id ? null : p.id)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--tx)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span>{p.bandeira} {p.nome} <span style={{ color: 'var(--tx3)' }}>· {p.qtd}</span></span>
                      <b style={{ fontWeight: 600 }}>{moeda(p.valor, 'BRL', true)}</b>
                    </div>
                    <Barra valor={(p.valor / maxV) * 100} cor={pais === p.id ? 'var(--brand)' : 'var(--tx3)'} altura={5} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* ---------- riscos + produtos ---------- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 14 }}>
            <div className="card card-p">
              <div className="sec-h"><h2>Riscos críticos em aberto</h2></div>
              {riscosCriticos.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--tx2)' }}>Nenhum risco de criticidade alta nos filtros atuais.</p>
              ) : riscosCriticos.map(({ r, o }) => (
                <button key={o.id + r.id} onClick={() => abrirOportunidade(o.id)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--line)', padding: '10px 2px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--tx)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <Badge cor="var(--danger)">{r.categoria}</Badge>
                    <span style={{ fontSize: 11, color: 'var(--tx3)' }}>criticidade {criticidade(r)}/25</span>
                  </div>
                  <b style={{ fontSize: 12.5, fontWeight: 500, display: 'block', lineHeight: 1.4 }}>{r.descricao}</b>
                  <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>{o.titulo}</span>
                </button>
              ))}
            </div>

            <div className="card card-p">
              <div className="sec-h">
                <h2>Produtos mais demandados</h2>
                <span className="sub">por valor em disputa</span>
              </div>
              {produtos.map(([nome, valor]) => (
                <div key={nome} style={{ padding: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span>{nome}</span>
                    <b style={{ fontWeight: 600 }}>{moeda(valor, 'BRL', true)}</b>
                  </div>
                  <Barra valor={(valor / (produtos[0]?.[1] || 1)) * 100} cor="var(--teal)" altura={5} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ---------- tooltips ---------- */
interface DicaProps { active?: boolean; payload?: { payload: Record<string, unknown> }[]; label?: string }

function cxTooltip(): React.CSSProperties {
  return {
    background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 10,
    padding: '9px 12px', fontSize: 12, boxShadow: 'var(--card-shadow)', maxWidth: 260, color: 'var(--tx)',
  }
}

function DicaMapa({ active, payload }: DicaProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { nome: string; x: number; y: number; z: number }
  return (
    <div style={cxTooltip()}>
      <b style={{ display: 'block', marginBottom: 4, lineHeight: 1.35 }}>{d.nome}</b>
      Aderência {d.x} · Probabilidade {d.y}%<br />
      Valor {moeda(d.z, 'BRL', true)}
    </div>
  )
}

function DicaProjecao({ active, payload, label }: DicaProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { esperado: number; bruto: number }
  return (
    <div style={cxTooltip()}>
      <b style={{ textTransform: 'capitalize' }}>{label}</b><br />
      Esperado {moeda(d.esperado, 'BRL', true)}<br />
      <span style={{ color: 'var(--tx2)' }}>Bruto {moeda(d.bruto, 'BRL', true)}</span>
    </div>
  )
}

function DicaEtapa({ active, payload, label }: DicaProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { qtd: number; valor: number }
  return (
    <div style={cxTooltip()}>
      <b>{label}</b><br />
      {d.qtd} oportunidade(s)<br />
      <span style={{ color: 'var(--tx2)' }}>{moeda(d.valor, 'BRL', true)}</span>
    </div>
  )
}
