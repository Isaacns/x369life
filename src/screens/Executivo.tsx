import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { MODO_DEMO } from '../app.config'
import { comPesos, useDados } from '../lib/dados'
import { paisPorId } from '../lib/demo'
import { avaliar, ROTULOS_ADERENCIA } from '../lib/scoring'
import { ETAPAS } from '../lib/tipos'
import { corRisco, moeda, pct, totalCarteira } from '../lib/formato'
import { FaixaDemo, Vazio } from '../ui/kit'
import { useNavegacao } from '../ui/navegacao'
import { useTema } from '../ui/tema'

const ENCERRADAS = ['vencida', 'perdida', 'descartada']

export default function Executivo() {
  const { oportunidades, perfilOrg, pesos } = useDados()
  const { abrirOportunidade } = useNavegacao()
  const { cores } = useTema()
  const [foco, setFoco] = useState<'valor' | 'quantidade'>('valor')

  const linhas = useMemo(
    () => oportunidades.map((o) => ({ o, a: avaliar(comPesos(o, pesos), perfilOrg) })),
    [oportunidades, perfilOrg, pesos],
  )
  const abertas = linhas.filter(({ o, a }) => !ENCERRADAS.includes(o.etapa) && (a.diasRestantes === null || a.diasRestantes > 0))

  const valorBruto = abertas.reduce((s, { o }) => s + o.valor, 0)
  const valorEsperado = abertas.reduce((s, { o, a }) => s + o.valor * a.probabilidade.p, 0)
  const margemEsperada = abertas.reduce((s, { a }) => s + (a.viabilidade?.valorEsperado ?? 0), 0)
  const confianca = abertas.length
    ? Math.round(abertas.reduce((s, { a }) => s + a.probabilidade.confianca, 0) / abertas.length) : 0

  /* ---------- 1. funil ---------- */
  const funil = ETAPAS.filter((e) => !ENCERRADAS.includes(e.id)).map((e) => {
    const g = linhas.filter(({ o }) => o.etapa === e.id)
    return { nome: e.label, qtd: g.length, valor: g.reduce((s, { o }) => s + o.valor, 0) }
  }).filter((e) => e.qtd > 0)

  /* ---------- 2. Pareto: concentração do valor esperado ---------- */
  const pareto = useMemo(() => {
    const ord = [...abertas]
      .map(({ o, a }) => ({ nome: o.titulo, id: o.id, esperado: o.valor * a.probabilidade.p }))
      .sort((x, y) => y.esperado - x.esperado)
    let acc = 0
    return ord.map((d, i) => {
      acc += d.esperado
      return {
        rotulo: `#${i + 1}`,
        nome: d.nome, id: d.id,
        esperado: Math.round(d.esperado),
        acumulado: valorEsperado > 0 ? Math.round((acc / valorEsperado) * 100) : 0,
      }
    })
  }, [abertas, valorEsperado])
  const quantasFazem80 = pareto.findIndex((p) => p.acumulado >= 80) + 1

  /* ---------- 3. radar: capacidade × exigência do mercado ---------- */
  const radar = useMemo(() => {
    const ids = Object.keys(ROTULOS_ADERENCIA)
    return ids.map((id) => {
      const scores = abertas
        .map(({ o }) => o.componentesAderencia.find((c) => c.id === id)?.score)
        .filter((s): s is number => s !== null && s !== undefined)
      const nossa = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
      // exigência do mercado = peso relativo do critério, normalizado para 0–100
      const peso = pesos[id] ?? 0
      const maxPeso = Math.max(...Object.values(pesos))
      return {
        criterio: ROTULOS_ADERENCIA[id].split(' ')[0],
        completo: ROTULOS_ADERENCIA[id],
        nossa: Math.round(nossa),
        exigencia: Math.round((peso / maxPeso) * 100),
        cobertura: scores.length,
      }
    })
  }, [abertas, pesos])

  /* ---------- 4. matriz país × produto ---------- */
  const matriz = useMemo(() => {
    const paises = [...new Set(abertas.map(({ o }) => o.paisId))]
    const produtos = [...new Set(abertas.flatMap(({ o }) => o.produtos))]
    const celula = (p: string, prod: string) => abertas
      .filter(({ o }) => o.paisId === p && o.produtos.includes(prod))
      .reduce((s, { o }) => s + (foco === 'valor' ? o.valor : 1), 0)
    const valores = paises.flatMap((p) => produtos.map((prod) => celula(p, prod)))
    const max = Math.max(...valores, 1)
    return { paises, produtos, celula, max }
  }, [abertas, foco])

  /* ---------- 5. exposição por risco ---------- */
  const exposicao = useMemo(() => {
    const faixas = ['baixo', 'moderado', 'alto', 'critico'] as const
    return faixas.map((f) => {
      const g = abertas.filter(({ a }) => a.risco.nivel === f)
      return {
        nivel: f, qtd: g.length,
        valor: g.reduce((s, { o }) => s + o.valor, 0),
        esperado: g.reduce((s, { o, a }) => s + o.valor * a.probabilidade.p, 0),
      }
    }).filter((f) => f.qtd > 0)
  }, [abertas])

  /* ---------- 6. calendário de prazos ---------- */
  const calendario = useMemo(() => {
    const blocos = [
      { rotulo: '0–15 d', min: 0, max: 15 },
      { rotulo: '16–30 d', min: 16, max: 30 },
      { rotulo: '31–60 d', min: 31, max: 60 },
      { rotulo: '61–90 d', min: 61, max: 90 },
      { rotulo: '90+ d', min: 91, max: 99999 },
    ]
    return blocos.map((b) => {
      const g = abertas.filter(({ a }) => a.diasRestantes !== null
        && a.diasRestantes >= b.min && a.diasRestantes <= b.max)
      return { rotulo: b.rotulo, qtd: g.length, esperado: Math.round(g.reduce((s, { o, a }) => s + o.valor * a.probabilidade.p, 0)) }
    })
  }, [abertas])

  if (abertas.length === 0) {
    return <Vazio titulo="Sem carteira aberta" texto="Cadastre ou importe oportunidades para o painel executivo ter o que apresentar." />
  }

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h">
        <h1>Painel executivo</h1>
        <p>Leitura de carteira para conselho e diretoria — concentração, exposição, capacidade e calendário.</p>
      </div>

      {/* ---------- veredito ----------
          Sem filete de acento: este cartão já é o primeiro da tela e carrega os
          números maiores. A barra colorida não codificava nada — era só "olhe
          para mim". Onde o filete sobrevive no sistema (Inteligência, Fontes),
          ele codifica estado: severidade do achado, situação da fonte. */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 20, marginBottom: 16 }}>
          <Grande rotulo="Valor em disputa" valor={totalCarteira(abertas.map(({ o }) => o))}
            sub={`${abertas.length} editais abertos`} />
          <Grande rotulo="Valor esperado" valor={moeda(valorEsperado, 'BRL', true)} cor="var(--brand)"
            sub={`${pct((valorEsperado / valorBruto) * 100)} do bruto`} />
          <Grande rotulo="Margem esperada" valor={moeda(margemEsperada, 'BRL', true)} cor="var(--teal)"
            sub="onde há viabilidade calculada" />
          <Grande rotulo="Confiança média" valor={`${confianca}%`} cor={confianca >= 70 ? 'var(--teal)' : 'var(--amber)'}
            sub="quanto do modelo tem dado real" />
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--tx2)', margin: 0, lineHeight: 1.6, maxWidth: '70ch' }}>
          <b style={{ color: 'var(--tx)' }}>Leitura:</b> {quantasFazem80 > 0 ? (
            <>{quantasFazem80} de {abertas.length} oportunidades respondem por 80% de todo o valor esperado. </>
          ) : null}
          A carteira converte {pct((valorEsperado / valorBruto) * 100)} do valor bruto em expectativa —
          o restante é disputa que a empresa provavelmente não ganha e que ainda assim consome equipe.
        </p>
      </div>

      {/* ---------- funil + pareto ---------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 14, marginBottom: 14 }}>
        <div className="card card-p">
          <div className="sec-h">
            <h2>Funil comercial</h2>
            <span className="sub">valor por etapa</span>
          </div>
          {funil.map((e, i) => {
            const largura = (e.valor / Math.max(...funil.map((f) => f.valor), 1)) * 100
            return (
              <div key={e.nome} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>{e.nome} <span style={{ color: 'var(--tx3)' }}>· {e.qtd}</span></span>
                  <b style={{ fontWeight: 600 }}>{moeda(e.valor, 'BRL', true)}</b>
                </div>
                <div style={{ height: 22, background: 'var(--bg2)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.max(largura, 2)}%`, height: '100%', borderRadius: 5,
                    background: `color-mix(in srgb, var(--brand) ${95 - i * 9}%, var(--bg2))`,
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="card card-p">
          <div className="sec-h">
            <h2>Concentração do resultado</h2>
            <span className="sub">quantas oportunidades fazem 80% do valor esperado</span>
          </div>
          <ResponsiveContainer width="100%" height={228}>
            <ComposedChart data={pareto} margin={{ top: 8, right: 4, bottom: 4, left: -16 }}>
              <CartesianGrid stroke={cores.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="rotulo" tick={{ fontSize: 10, fill: cores.texto }} stroke={cores.grid} />
              <YAxis yAxisId="e" tickFormatter={(v: number) => moeda(v, 'BRL', true)}
                tick={{ fontSize: 10, fill: cores.texto }} stroke={cores.grid} width={62} />
              <YAxis yAxisId="a" orientation="right" domain={[0, 100]} unit="%"
                tick={{ fontSize: 10, fill: cores.texto }} stroke={cores.grid} width={38} />
              <Tooltip content={<DicaPareto />} cursor={{ fill: cores.suave }} />
              <Bar yAxisId="e" dataKey="esperado" fill={cores.brand} radius={[4, 4, 0, 0]} maxBarSize={34}
                onClick={(d) => { const id = (d as unknown as { id?: string }).id; if (id) abrirOportunidade(id) }}
                style={{ cursor: 'pointer' }} />
              <Line yAxisId="a" type="monotone" dataKey="acumulado" stroke={cores.amber} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '6px 0 0' }}>
            Barra: valor esperado de cada oportunidade. Linha: acumulado. Clique na barra para abrir o edital.
          </p>
        </div>
      </div>

      {/* ---------- radar + risco ---------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 14, marginBottom: 14 }}>
        <div className="card card-p">
          <div className="sec-h">
            <h2>Capacidade × exigência do mercado</h2>
            <span className="sub">média da carteira contra o peso de cada critério</span>
          </div>
          <ResponsiveContainer width="100%" height={272}>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={cores.grid} />
              <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 10, fill: cores.texto }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: cores.texto }} stroke={cores.grid} />
              <Radar name="Exigência do mercado" dataKey="exigencia" stroke={cores.amber}
                fill={cores.amber} fillOpacity={0.10} strokeWidth={1.5} strokeDasharray="4 3" />
              <Radar name="Nossa capacidade" dataKey="nossa" stroke={cores.brand}
                fill={cores.brand} fillOpacity={0.28} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 11, color: cores.texto }} />
              <Tooltip content={<DicaRadar />} />
            </RadarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '4px 0 0' }}>
            Onde a área azul entra para dentro da tracejada, o mercado cobra mais do que a empresa entrega hoje.
          </p>
        </div>

        <div className="card card-p">
          <div className="sec-h">
            <h2>Exposição por nível de risco</h2>
            <span className="sub">quanto da carteira está em cada faixa</span>
          </div>
          <ResponsiveContainer width="100%" height={228}>
            <BarChart data={exposicao} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
              <CartesianGrid stroke={cores.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => moeda(v, 'BRL', true)}
                tick={{ fontSize: 10, fill: cores.texto }} stroke={cores.grid} />
              <YAxis type="category" dataKey="nivel" width={66}
                tick={{ fontSize: 11, fill: cores.texto }} stroke={cores.grid} />
              <Tooltip content={<DicaRisco />} cursor={{ fill: cores.suave }} />
              <Bar dataKey="valor" radius={[0, 5, 5, 0]} maxBarSize={30}>
                {exposicao.map((e) => <Cell key={e.nivel} fill={corRisco(e.nivel)} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '6px 0 0' }}>
            Carteira concentrada em risco alto significa receita provável, mas execução cara.
          </p>
        </div>
      </div>

      {/* ---------- matriz + calendário ---------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 14 }}>
        <div className="card card-p">
          <div className="sec-h">
            <h2>Onde está o dinheiro</h2>
            <span style={{ flex: 1 }} />
            <button className={'chip' + (foco === 'valor' ? ' on' : '')} onClick={() => setFoco('valor')}>Valor</button>
            <button className={'chip' + (foco === 'quantidade' ? ' on' : '')} onClick={() => setFoco('quantidade')}>Editais</button>
          </div>
          <div className="tbl-wrap">
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 340 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--tx2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em' }}>País</th>
                  {matriz.produtos.map((p) => (
                    <th key={p} style={{ padding: '6px 4px', color: 'var(--tx2)', fontSize: 9.5, fontWeight: 600, maxWidth: 74, lineHeight: 1.25 }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriz.paises.map((pid) => (
                  <tr key={pid}>
                    <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                      {paisPorId(pid).bandeira} {paisPorId(pid).nome}
                    </td>
                    {matriz.produtos.map((prod) => {
                      const v = matriz.celula(pid, prod)
                      const int = v / matriz.max
                      return (
                        <td key={prod} style={{ padding: 3, textAlign: 'center' }}>
                          <div style={{
                            borderRadius: 6, padding: '9px 4px', fontSize: 10.5, fontWeight: 700,
                            background: v === 0 ? 'var(--bg2)' : `color-mix(in srgb, var(--brand) ${Math.round(int * 78 + 8)}%, var(--card))`,
                            color: v === 0 ? 'var(--tx3)' : int > 0.45 ? '#fff' : 'var(--tx)',
                          }}>
                            {v === 0 ? '–' : foco === 'valor' ? moeda(v, 'BRL', true) : v}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '10px 0 0' }}>
            Célula escura = concentração. Coluna inteira clara = categoria do catálogo que o mercado não está pedindo.
          </p>
        </div>

        <div className="card card-p">
          <div className="sec-h">
            <h2>Calendário de decisão</h2>
            <span className="sub">valor esperado por janela de prazo</span>
          </div>
          <ResponsiveContainer width="100%" height={228}>
            <BarChart data={calendario} margin={{ top: 8, right: 8, bottom: 4, left: -14 }}>
              <CartesianGrid stroke={cores.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="rotulo" tick={{ fontSize: 10.5, fill: cores.texto }} stroke={cores.grid} />
              <YAxis tickFormatter={(v: number) => moeda(v, 'BRL', true)}
                tick={{ fontSize: 10, fill: cores.texto }} stroke={cores.grid} width={62} />
              <Tooltip content={<DicaCalendario />} cursor={{ fill: cores.suave }} />
              <Bar dataKey="esperado" radius={[5, 5, 0, 0]} maxBarSize={44}>
                {calendario.map((c, i) => (
                  <Cell key={c.rotulo} fill={i === 0 ? cores.danger : i === 1 ? cores.amber : cores.brand} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '6px 0 0' }}>
            A primeira coluna é o que decide nas próximas duas semanas — vermelha porque não é adiável.
          </p>
        </div>
      </div>
    </>
  )
}

function Grande({ rotulo, valor, sub, cor }: { rotulo: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--tx2)', fontWeight: 600 }}>{rotulo}</div>
      <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: '-.035em', color: cor, marginTop: 3, lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--tx3)' }}>{sub}</div>}
    </div>
  )
}

/* ---------- tooltips ---------- */
interface DicaProps { active?: boolean; payload?: { payload: Record<string, unknown> }[]; label?: string }
const cx: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 10,
  padding: '9px 12px', fontSize: 12, boxShadow: 'var(--card-shadow)', maxWidth: 250, color: 'var(--tx)',
}

function DicaPareto({ active, payload }: DicaProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { nome: string; esperado: number; acumulado: number }
  return (
    <div style={cx}>
      <b style={{ display: 'block', marginBottom: 4, lineHeight: 1.35 }}>{d.nome}</b>
      Esperado {moeda(d.esperado, 'BRL', true)}<br />
      <span style={{ color: 'var(--tx2)' }}>Acumulado até aqui: {d.acumulado}%</span>
    </div>
  )
}

function DicaRadar({ active, payload }: DicaProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { completo: string; nossa: number; exigencia: number; cobertura: number }
  return (
    <div style={cx}>
      <b style={{ display: 'block', marginBottom: 4 }}>{d.completo}</b>
      Nossa capacidade: {d.nossa}<br />
      Exigência do mercado: {d.exigencia}<br />
      <span style={{ color: 'var(--tx2)' }}>Baseado em {d.cobertura} avaliação(ões)</span>
    </div>
  )
}

function DicaRisco({ active, payload }: DicaProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { nivel: string; qtd: number; valor: number; esperado: number }
  return (
    <div style={cx}>
      <b style={{ textTransform: 'capitalize' }}>Risco {d.nivel}</b><br />
      {d.qtd} edital(is) · {moeda(d.valor, 'BRL', true)}<br />
      <span style={{ color: 'var(--tx2)' }}>Esperado {moeda(d.esperado, 'BRL', true)}</span>
    </div>
  )
}

function DicaCalendario({ active, payload, label }: DicaProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { qtd: number; esperado: number }
  return (
    <div style={cx}>
      <b>{label}</b><br />
      {d.qtd} edital(is)<br />
      <span style={{ color: 'var(--tx2)' }}>Esperado {moeda(d.esperado, 'BRL', true)}</span>
    </div>
  )
}
