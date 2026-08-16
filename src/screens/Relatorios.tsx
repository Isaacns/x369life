import { useMemo, useState } from 'react'
import { APP, AVISO_DEMO, AVISO_LEGAL, MODO_DEMO } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { comPesos, useDados } from '../lib/dados'
import { paisPorId } from '../lib/demo'
import { avaliar, criticidade, type Avaliacao } from '../lib/scoring'
import { ETAPAS, type Oportunidade } from '../lib/tipos'
import { corAderencia, corRisco, moeda, data as fData, pct, rotuloPrazo } from '../lib/formato'
import { Badge, Barra, FaixaDemo, useToast } from '../ui/kit'
import { Marca } from '../ui/Marca'

type TipoRelatorio =
  | 'edital' | 'aderencia' | 'checklist' | 'riscos'
  | 'swot' | 'pestel' | 'viabilidade' | 'decisao' | 'pipeline'

const TIPOS: { id: TipoRelatorio; label: string; desc: string; porOportunidade: boolean }[] = [
  { id: 'edital',      label: 'Resumo do edital',       desc: 'Ficha completa com valores, prazos e recomendação.', porOportunidade: true },
  { id: 'aderencia',   label: 'Aderência',              desc: 'Nota, componentes, lacunas e ações.',                porOportunidade: true },
  { id: 'checklist',   label: 'Checklist documental',   desc: 'Documentos, responsáveis, prazos e status.',         porOportunidade: true },
  { id: 'riscos',      label: 'Riscos',                 desc: 'Matriz por categoria com evidência e mitigação.',    porOportunidade: true },
  { id: 'swot',        label: 'SWOT',                   desc: 'Matriz com status de validação humana.',             porOportunidade: true },
  { id: 'pestel',      label: 'PESTEL',                 desc: 'Fatores do ambiente com fonte e incerteza.',         porOportunidade: true },
  { id: 'viabilidade', label: 'Viabilidade',            desc: 'Margem, cenários e valor esperado.',                 porOportunidade: true },
  { id: 'decisao',     label: 'Decisão de participação',desc: 'Recomendação, decisão registrada e justificativa.',  porOportunidade: true },
  { id: 'pipeline',    label: 'Pipeline',               desc: 'Carteira completa com valor ponderado.',             porOportunidade: false },
]

export default function Relatorios() {
  const { oportunidades, perfilOrg, pesos } = useDados()
  const { usuario } = useAuth()
  const toast = useToast()
  const [tipo, setTipo] = useState<TipoRelatorio>('edital')
  const [opId, setOpId] = useState(oportunidades[0]?.id ?? '')

  const meta = TIPOS.find((t) => t.id === tipo)!
  const linhas = useMemo(
    () => oportunidades.map((o) => ({ o, a: avaliar(comPesos(o, pesos), perfilOrg) })),
    [oportunidades, perfilOrg, pesos],
  )
  const alvo = linhas.find(({ o }) => o.id === opId) ?? linhas[0]

  function exportarCsv() {
    const cabecalho = ['Objeto', 'Comprador', 'País', 'Valor', 'Moeda', 'Prazo', 'Dias restantes',
      'Aderência', 'Confiança', 'Risco', 'Nível', 'Probabilidade %', 'Valor esperado', 'Etapa', 'Responsável']
    const corpo = linhas.map(({ o, a }) => [
      o.titulo, o.comprador, paisPorId(o.paisId).nome, o.valor, o.moeda, o.prazo, a.diasRestantes,
      a.aderencia.nota, a.aderencia.confianca, a.risco.score, a.risco.nivel,
      Math.round(a.probabilidade.p * 100), Math.round(o.valor * a.probabilidade.p),
      ETAPAS.find((e) => e.id === o.etapa)?.label, o.responsavel,
    ])
    const csv = [cabecalho, ...corpo]
      .map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `x369life-pipeline-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV exportado.')
  }

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h">
        <h1>Relatórios</h1>
        <p>Todo relatório sai com data, responsável, fontes, premissas e limitações — é peça de decisão, não resumo solto.</p>
      </div>

      <div className="card card-p nao-imprime" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
          {TIPOS.map((t) => (
            <button key={t.id} className={'chip' + (tipo === t.id ? ' on' : '')} onClick={() => setTipo(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--tx2)', flex: '1 1 200px' }}>{meta.desc}</span>
          {meta.porOportunidade && (
            <select className="inp" value={opId} onChange={(e) => setOpId(e.target.value)}
              style={{ width: 'auto', maxWidth: 380, height: 36, fontSize: 13 }} aria-label="Oportunidade">
              {oportunidades.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
            </select>
          )}
          <button className="b-ghost" onClick={exportarCsv}>Exportar CSV</button>
          <button className="b" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>

      <div className="card card-p">
        <Cabecalho titulo={meta.label} responsavel={usuario?.nome ?? '—'} organizacao={perfilOrg.nome} />

        {tipo === 'pipeline'
          ? <CorpoPipeline linhas={linhas} />
          : alvo ? <CorpoOportunidade tipo={tipo} o={alvo.o} a={alvo.a} /> : null}

        <Notas />
      </div>
    </>
  )
}

/* ---------------- cabeçalho e rodapé do documento ---------------- */

function Cabecalho({ titulo, responsavel, organizacao }: { titulo: string; responsavel: string; organizacao: string }) {
  return (
    <div style={{ borderBottom: '2px solid var(--brand)', paddingBottom: 14, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ marginBottom: 10 }}><Marca tamanho={32} /></div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{titulo}</h1>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--tx2)', textAlign: 'right', lineHeight: 1.7 }}>
          <div><b style={{ color: 'var(--tx)' }}>Emitido em</b> {new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
          <div><b style={{ color: 'var(--tx)' }}>Responsável</b> {responsavel}</div>
          <div><b style={{ color: 'var(--tx)' }}>Organização</b> {organizacao}</div>
        </div>
      </div>
    </div>
  )
}

function Notas() {
  return (
    <div style={{ marginTop: 26, paddingTop: 16, borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.65 }}>
      <b style={{ color: 'var(--tx)', display: 'block', marginBottom: 5 }}>Premissas e limitações</b>
      <ul style={{ margin: 0, paddingLeft: 17 }}>
        <li>As notas de aderência e risco seguem os pesos configurados pelo administrador na data da emissão.</li>
        <li>A probabilidade é resultado de modelo causal explicável, não de modelo estatístico treinado em histórico de licitações.</li>
        <li>Critério sem dado informado entra como zero na nota efetiva e reduz a confiança do cálculo.</li>
        <li>Nenhuma coleta automática de editais está ativa: os dados vêm de cadastro manual ou importação documental.</li>
        {MODO_DEMO && <li><b style={{ color: 'var(--amber)' }}>{AVISO_DEMO}</b></li>}
      </ul>
      <p style={{ marginTop: 10, marginBottom: 0 }}>{AVISO_LEGAL}</p>
      <p style={{ marginTop: 8, marginBottom: 0, color: 'var(--tx3)' }}>{APP.nome} v{APP.versao} · {APP.rodape}</p>
    </div>
  )
}

/* ---------------- corpos ---------------- */

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22, breakInside: 'avoid' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--brand)', marginBottom: 10 }}>{titulo}</h2>
      {children}
    </div>
  )
}

function Par({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
      <span style={{ color: 'var(--tx2)' }}>{rotulo}</span>
      <b style={{ fontWeight: 600, textAlign: 'right' }}>{valor}</b>
    </div>
  )
}

function CorpoOportunidade({ tipo, o, a }: { tipo: TipoRelatorio; o: Oportunidade; a: Avaliacao }) {
  const pais = paisPorId(o.paisId)
  return (
    <>
      <Secao titulo="Identificação">
        <Par rotulo="Objeto" valor={o.titulo} />
        <Par rotulo="Comprador" valor={o.comprador} />
        <Par rotulo="País" valor={`${pais.bandeira} ${pais.nome}`} />
        <Par rotulo="Valor estimado" valor={moeda(o.valor, o.moeda)} />
        <Par rotulo="Prazo de entrega da proposta" valor={`${fData(o.prazo)} · ${rotuloPrazo(a.diasRestantes)}`} />
        <Par rotulo="Etapa no pipeline" valor={ETAPAS.find((e) => e.id === o.etapa)?.label ?? '—'} />
        <Par rotulo="Responsável" valor={o.responsavel} />
      </Secao>

      {(tipo === 'edital' || tipo === 'aderencia') && (
        <Secao titulo="Aderência">
          <div style={{ display: 'flex', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>
            <Num rotulo="Nota efetiva" valor={String(a.aderencia.nota)} cor={corAderencia(a.aderencia.nota)} />
            <Num rotulo="Confiança" valor={`${a.aderencia.confianca}%`} />
            <Num rotulo="Potencial" valor={String(a.aderencia.potencial)} cor="var(--teal)" />
            <Num rotulo="Probabilidade" valor={pct(a.probabilidade.p * 100)} />
          </div>
          {o.componentesAderencia.map((c) => (
            <div key={c.id} style={{ padding: '5px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                <span>{c.label} <span style={{ color: 'var(--tx3)' }}>· peso {c.peso}%</span></span>
                <b>{c.score === null ? 'dado ausente' : c.score}</b>
              </div>
              <Barra valor={c.score ?? 0} cor={c.score === null ? 'var(--amber)' : corAderencia(c.score)} altura={4} />
            </div>
          ))}
          {a.aderencia.ausentes.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 10, marginBottom: 0 }}>
              Dados ausentes: {a.aderencia.ausentes.map((c) => c.label).join(', ')}.
            </p>
          )}
        </Secao>
      )}

      {(tipo === 'edital' || tipo === 'riscos') && a.risco.porCategoria.length > 0 && (
        <Secao titulo="Riscos">
          <div style={{ marginBottom: 12, fontSize: 13 }}>
            Score global <b style={{ color: corRisco(a.risco.nivel) }}>{a.risco.score}/100 · {a.risco.nivel}</b>
          </div>
          <table className="tbl">
            <thead><tr><th>Risco</th><th>Categoria</th><th>Crit.</th><th>Evidência</th><th>Mitigação</th></tr></thead>
            <tbody>
              {a.risco.porCategoria.flatMap((c) => c.itens).sort((x, y) => criticidade(y) - criticidade(x)).map((i) => (
                <tr key={i.id} style={{ cursor: 'default' }}>
                  <td data-l="Risco">{i.descricao}</td>
                  <td data-l="Categoria">{i.categoria}</td>
                  <td data-l="Criticidade">{criticidade(i)}/25</td>
                  <td data-l="Evidência" style={{ fontSize: 11.5, color: 'var(--tx2)' }}>{i.evidencia}</td>
                  <td data-l="Mitigação" style={{ fontSize: 11.5, color: 'var(--tx2)' }}>{i.mitigacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Secao>
      )}

      {tipo === 'checklist' && (
        <Secao titulo="Checklist documental">
          {o.documentos.length === 0 ? <Nada /> : (
            <table className="tbl">
              <thead><tr><th>Documento</th><th>Obrigatório</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
              <tbody>
                {o.documentos.map((d) => (
                  <tr key={d.id} style={{ cursor: 'default' }}>
                    <td data-l="Documento">{d.nome}</td>
                    <td data-l="Obrigatório">{d.obrigatorio ? 'Sim' : 'Não'}</td>
                    <td data-l="Responsável">{d.responsavel ?? '—'}</td>
                    <td data-l="Prazo">{d.prazo ? fData(d.prazo) : '—'}</td>
                    <td data-l="Status">{d.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>
      )}

      {tipo === 'swot' && (
        <Secao titulo="SWOT">
          {o.swot.length === 0 ? <Nada /> : o.swot.map((s) => (
            <div key={s.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <b style={{ textTransform: 'capitalize', fontWeight: 600 }}>{s.categoria}</b> · {s.descricao}
              <span style={{ color: 'var(--tx3)', fontSize: 11.5 }}> · impacto {s.impacto}/5 · {s.validado ? 'validado' : 'a validar'}</span>
            </div>
          ))}
        </Secao>
      )}

      {tipo === 'pestel' && (
        <Secao titulo="PESTEL">
          {o.pestel.length === 0 ? <Nada /> : o.pestel.map((f) => (
            <div key={f.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <b style={{ textTransform: 'capitalize', fontWeight: 600 }}>{f.categoria}</b> · {f.descricao}
              <span style={{ color: 'var(--tx3)', fontSize: 11.5 }}> · {f.tendencia} · impacto {f.impacto} · incerteza {f.incerteza} · fonte: {f.fonte}</span>
            </div>
          ))}
        </Secao>
      )}

      {tipo === 'viabilidade' && (
        <Secao titulo="Viabilidade">
          {!a.viabilidade ? <Nada /> : (
            <>
              <Par rotulo="Margem" valor={`${moeda(a.viabilidade.margem, o.moeda)} · ${a.viabilidade.margemPct.toFixed(1)}%`} />
              <Par rotulo="Valor esperado (base)" valor={moeda(a.viabilidade.valorEsperado, o.moeda)} />
              {a.viabilidade.cenarios.map((c) => (
                <Par key={c.nome} rotulo={`Cenário ${c.nome} (${pct(c.p * 100)})`} valor={moeda(c.valorEsperado, o.moeda)} />
              ))}
            </>
          )}
        </Secao>
      )}

      {(tipo === 'edital' || tipo === 'decisao') && (
        <Secao titulo="Recomendação e decisão">
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand)', marginBottom: 6 }}>{a.recomendacao.titulo}</div>
          <ul style={{ margin: '0 0 12px', paddingLeft: 17, fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.6 }}>
            {a.recomendacao.motivos.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
          <Par rotulo="Decisão registrada" valor={o.decisao ? o.decisao.replace('_', ' ') : 'ainda não registrada'} />
          {o.decisaoJustificativa && <Par rotulo="Justificativa" valor={o.decisaoJustificativa} />}
          <Par rotulo="Confiança do cálculo" valor={`${a.recomendacao.confianca}%`} />
        </Secao>
      )}

      {o.camposExtraidos.length > 0 && (tipo === 'edital') && (
        <Secao titulo="Fontes das informações">
          {o.camposExtraidos.map((c, i) => (
            <div key={i} style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--line)', color: 'var(--tx2)' }}>
              <b style={{ color: 'var(--tx)' }}>{c.campo}:</b> {c.valor} — {c.evidencia.documento}, p. {c.evidencia.pagina}
              {c.evidencia.secao ? `, ${c.evidencia.secao}` : ''} · confiança {Math.round(c.evidencia.confianca * 100)}%
              · {c.evidencia.revisadoPor ? `revisado por ${c.evidencia.revisadoPor}` : 'não revisado'}
            </div>
          ))}
        </Secao>
      )}
    </>
  )
}

function CorpoPipeline({ linhas }: { linhas: { o: Oportunidade; a: Avaliacao }[] }) {
  const ativas = linhas.filter(({ o }) => !['vencida', 'perdida', 'descartada'].includes(o.etapa))
  const total = ativas.reduce((s, { o }) => s + o.valor, 0)
  const ponderado = ativas.reduce((s, { o, a }) => s + o.valor * a.probabilidade.p, 0)
  return (
    <>
      <Secao titulo="Resumo da carteira">
        <Par rotulo="Oportunidades ativas" valor={String(ativas.length)} />
        <Par rotulo="Valor total" valor={moeda(total, 'BRL')} />
        <Par rotulo="Valor ponderado pela probabilidade" valor={moeda(ponderado, 'BRL')} />
      </Secao>
      <Secao titulo="Carteira">
        <table className="tbl">
          <thead><tr><th>Objeto</th><th>Etapa</th><th>Valor</th><th>Aderência</th><th>Chance</th><th>Esperado</th></tr></thead>
          <tbody>
            {linhas.map(({ o, a }) => (
              <tr key={o.id} style={{ cursor: 'default' }}>
                <td data-l="Objeto">{o.titulo}</td>
                <td data-l="Etapa">{ETAPAS.find((e) => e.id === o.etapa)?.label}</td>
                <td data-l="Valor">{moeda(o.valor, o.moeda, true)}</td>
                <td data-l="Aderência">
                  <Badge cor={corAderencia(a.aderencia.nota)}>{a.aderencia.nota}</Badge>
                </td>
                <td data-l="Chance">{Math.round(a.probabilidade.p * 100)}%</td>
                <td data-l="Esperado">{moeda(o.valor * a.probabilidade.p, o.moeda, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>
    </>
  )
}

function Num({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', fontWeight: 600 }}>{rotulo}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.03em', color: cor }}>{valor}</div>
    </div>
  )
}

function Nada() {
  return <p style={{ fontSize: 13, color: 'var(--tx3)', margin: 0 }}>Sem dados registrados para esta seção nesta oportunidade.</p>
}
