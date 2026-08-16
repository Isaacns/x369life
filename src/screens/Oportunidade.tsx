import { useMemo, useState } from 'react'
import { MODO_DEMO } from '../app.config'
import { comPesos, useDados } from '../lib/dados'
import { paisPorId } from '../lib/demo'
import { avaliar, criticidade, type Avaliacao } from '../lib/scoring'
import { estadoIA } from '../lib/ia'
import {
  ETAPAS, type Decisao, type DocumentoExigido, type EtapaPipeline,
  type FatorPestel, type ItemSwot, type Oportunidade, type Prazo,
} from '../lib/tipos'
import { corAderencia, corPrazo, corRisco, moeda, data as fData, pct, rotuloPrazo } from '../lib/formato'
import { Abas, Badge, Barra, Campo, FaixaDemo, FaixaLegal, Modal, Rodape, useToast, Vazio } from '../ui/kit'
import { useNavegacao } from '../ui/navegacao'
import { useAuth } from '../auth/AuthContext'

type AbaId = 'resumo' | 'aderencia' | 'documentos' | 'prazos' | 'riscos' | 'viabilidade' | 'swot' | 'pestel' | 'fontes' | 'decisao'

const STATUS_DOC: Record<string, { label: string; cor: string }> = {
  nao_iniciado: { label: 'Não iniciado', cor: 'var(--tx3)' },
  preparacao: { label: 'Em preparação', cor: 'var(--amber)' },
  revisao: { label: 'Em revisão', cor: 'var(--info)' },
  concluido: { label: 'Concluído', cor: 'var(--teal)' },
  vencido: { label: 'Vencido', cor: 'var(--danger)' },
  nao_aplicavel: { label: 'Não aplicável', cor: 'var(--tx3)' },
}

const DECISOES: { id: Decisao; label: string }[] = [
  { id: 'participar', label: 'Participar' },
  { id: 'nao_participar', label: 'Não participar' },
  { id: 'aguardar', label: 'Aguardar' },
  { id: 'esclarecimento', label: 'Solicitar esclarecimento' },
  { id: 'parceiro_local', label: 'Buscar parceiro local' },
  { id: 'documentacao', label: 'Reunir documentação' },
]

export default function DetalheOportunidade({ id }: { id: string }) {
  const { oportunidades, perfilOrg, pesos, moverEtapa, registrarDecisao } = useDados()
  const { fecharOportunidade } = useNavegacao()
  const { usuario } = useAuth()
  const toast = useToast()
  const [aba, setAba] = useState<AbaId>('resumo')
  const [modalDecisao, setModalDecisao] = useState(false)

  const o = oportunidades.find((x) => x.id === id)
  const a = useMemo(() => (o ? avaliar(comPesos(o, pesos), perfilOrg) : null), [o, pesos, perfilOrg])

  if (!o || !a) {
    return <Vazio titulo="Oportunidade não encontrada" texto="Ela pode ter sido arquivada." >
      <button className="b-sm" onClick={fecharOportunidade}>Voltar</button>
    </Vazio>
  }

  const pais = paisPorId(o.paisId)
  const abas: { id: AbaId; label: string; contagem?: number }[] = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'aderencia', label: 'Aderência' },
    { id: 'documentos', label: 'Documentos', contagem: o.documentos.length || undefined },
    { id: 'prazos', label: 'Prazos', contagem: o.prazos.length || undefined },
    { id: 'riscos', label: 'Riscos', contagem: o.riscos.length || undefined },
    { id: 'viabilidade', label: 'Viabilidade' },
    { id: 'swot', label: 'SWOT', contagem: o.swot.length || undefined },
    { id: 'pestel', label: 'PESTEL', contagem: o.pestel.length || undefined },
    { id: 'fontes', label: 'Fontes', contagem: o.camposExtraidos.length || undefined },
    { id: 'decisao', label: 'Decisão' },
  ]

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <button className="b-sm nao-imprime" onClick={fecharOportunidade} style={{ marginBottom: 14 }}>← Oportunidades</button>

      {/* ---------- cabeçalho ---------- */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{pais.bandeira} {pais.nome} · {o.tipo}</span>
          <Badge cor={corRisco(a.risco.nivel)}>risco {a.risco.nivel} ({a.risco.score})</Badge>
          <span style={{ fontSize: 12.5, color: corPrazo(a.diasRestantes), fontWeight: 600 }}>
            prazo: {rotuloPrazo(a.diasRestantes)} · {fData(o.prazo)}
          </span>
        </div>

        <h1 style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{o.titulo}</h1>
        <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 16px' }}>{o.comprador}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
          <Numero rotulo="Valor estimado" valor={moeda(o.valor, o.moeda, true)} />
          <Numero rotulo="Aderência" valor={String(a.aderencia.nota)} cor={corAderencia(a.aderencia.nota)}
            sub={`confiança ${a.aderencia.confianca}% · potencial ${a.aderencia.potencial}`} />
          <Numero rotulo="Probabilidade" valor={pct(a.probabilidade.p * 100)}
            sub={`faixa ${pct(a.probabilidade.faixa[0] * 100)}–${pct(a.probabilidade.faixa[1] * 100)}`} />
          <Numero rotulo="Valor esperado" valor={moeda(o.valor * a.probabilidade.p, o.moeda, true)}
            sub="valor × probabilidade" />
        </div>

        <div className="nao-imprime" style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="inp" value={o.etapa} style={{ width: 'auto', height: 36, fontSize: 13 }}
            onChange={(e) => { moverEtapa(o.id, e.target.value as EtapaPipeline); toast('Etapa atualizada no pipeline.') }}
            aria-label="Etapa do pipeline">
            {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <button className="b" onClick={() => setModalDecisao(true)}>Registrar decisão</button>
          <button className="b-ghost" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>

      <Abas itens={abas} ativa={aba} onTrocar={setAba} />

      {aba === 'resumo' && <Resumo o={o} a={a} />}
      {aba === 'aderencia' && <AbaAderencia a={a} />}
      {aba === 'documentos' && <AbaDocumentos docs={o.documentos} />}
      {aba === 'prazos' && <AbaPrazos prazos={o.prazos} />}
      {aba === 'riscos' && <AbaRiscos a={a} />}
      {aba === 'viabilidade' && <AbaViabilidade o={o} a={a} />}
      {aba === 'swot' && <AbaSwot itens={o.swot} />}
      {aba === 'pestel' && <AbaPestel itens={o.pestel} />}
      {aba === 'fontes' && <AbaFontes o={o} />}
      {aba === 'decisao' && <AbaDecisao o={o} a={a} onRegistrar={() => setModalDecisao(true)} />}

      {modalDecisao && (
        <ModalDecisao sugestao={a.recomendacao.decisao} responsavelPadrao={usuario?.nome ?? ''}
          onFechar={() => setModalDecisao(false)}
          onSalvar={(d, j, r) => {
            registrarDecisao(o.id, d, j, r)
            setModalDecisao(false)
            toast('Decisão registrada com justificativa e responsável.')
          }} />
      )}
    </>
  )
}

/* ============================ RESUMO ============================ */

function Resumo({ o, a }: { o: Oportunidade; a: Avaliacao }) {
  const ia = estadoIA()
  const maxAbs = Math.max(...a.probabilidade.fatores.map((f) => Math.abs(f.contribuicao)), 0.4)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 14 }}>
        {/* recomendação */}
        <div className="card card-p">
          <div className="sec-h"><h2>Recomendação do sistema</h2></div>
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--brand)', marginBottom: 8 }}>
            {a.recomendacao.titulo}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--tx2)', lineHeight: 1.65 }}>
            {a.recomendacao.motivos.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--tx3)', lineHeight: 1.5 }}>
            Confiança do cálculo: <b style={{ color: 'var(--tx2)' }}>{a.recomendacao.confianca}%</b>.
            A recomendação é derivada dos dados desta tela — não é decisão jurídica, financeira ou comercial.
          </div>
        </div>

        {/* de onde vem a probabilidade */}
        <div className="card card-p">
          <div className="sec-h">
            <h2>De onde vem a probabilidade</h2>
            <span className="sub">cada fator, em contribuição visível</span>
          </div>
          {a.probabilidade.fatores.map((f) => {
            const largura = (Math.abs(f.contribuicao) / maxAbs) * 46
            const positivo = f.contribuicao >= 0
            return (
              <div key={f.label} style={{ marginBottom: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>
                    {f.label}
                    {!f.conhecido && <span style={{ color: 'var(--amber)', fontSize: 11 }}> · dado ausente</span>}
                  </span>
                  <span style={{ color: 'var(--tx3)', fontSize: 11.5 }}>{f.detalhe}</span>
                </div>
                <div style={{ display: 'flex', height: 7, alignItems: 'center' }}>
                  <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end' }}>
                    {!positivo && <span style={{ width: `${largura}%`, height: 7, background: 'var(--danger)', borderRadius: '20px 0 0 20px' }} />}
                  </div>
                  <span style={{ width: 1, height: 11, background: 'var(--line2)' }} />
                  <div style={{ width: '50%' }}>
                    {positivo && f.contribuicao > 0 && <span style={{ display: 'block', width: `${largura}%`, height: 7, background: 'var(--teal)', borderRadius: '0 20px 20px 0' }} />}
                  </div>
                </div>
              </div>
            )
          })}
          <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '10px 0 0', lineHeight: 1.5 }}>
            Modelo causal explicável, não modelo estatístico treinado. À esquerda o que reduz a chance,
            à direita o que aumenta. Faixa larga = dado faltando.
          </p>
        </div>
      </div>

      <div className="card card-p" style={{ marginBottom: 14 }}>
        <div className="sec-h"><h2>Ficha</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, fontSize: 13 }}>
          <Info rotulo="Objeto" valor={o.titulo} />
          <Info rotulo="Comprador" valor={o.comprador} />
          <Info rotulo="Produtos" valor={o.produtos.join(', ')} />
          <Info rotulo="Publicação" valor={fData(o.publicacao)} />
          <Info rotulo="Financiamento" valor={o.financiamento} />
          <Info rotulo="Parceiro local" valor={o.exigeParceiroLocal ? 'Exigido' : 'Não exigido'} />
          <Info rotulo="Concorrentes estimados" valor={o.concorrentesEstimados ? String(o.concorrentesEstimados) : 'não informado'} />
          <Info rotulo="Fonte" valor={o.fonte} />
          <Info rotulo="Responsável" valor={o.responsavel} />
        </div>
      </div>

      <div className="faixa faixa-legal" style={{ marginBottom: 0 }}>
        <span>◈</span>{ia.texto}
      </div>
    </>
  )
}

function Numero({ rotulo, valor, sub, cor }: { rotulo: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--tx2)', fontWeight: 600 }}>{rotulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.03em', color: cor, marginTop: 3 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{sub}</div>}
    </div>
  )
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', fontWeight: 600, marginBottom: 2 }}>{rotulo}</div>
      <div style={{ lineHeight: 1.45 }}>{valor}</div>
    </div>
  )
}

/* ============================ ADERÊNCIA ============================ */

function AbaAderencia({ a }: { a: Avaliacao }) {
  const ad = a.aderencia
  return (
    <>
      <div className="card card-p" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: corAderencia(ad.nota) }}>{ad.nota}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)' }}>nota efetiva</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 22 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{ad.confianca}%</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)' }}>confiança do cálculo</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 22 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--teal)' }}>{ad.potencial}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)' }}>potencial com as lacunas preenchidas</div>
          </div>
          <p style={{ flex: '1 1 240px', fontSize: 12, color: 'var(--tx2)', margin: 0, lineHeight: 1.5, minWidth: 220 }}>
            Componente sem dado entra como zero na nota efetiva e derruba a confiança —
            ausência nunca é tratada como atendimento integral.
          </p>
        </div>

        {a.aderencia.ausentes.length + a.aderencia.fortes.length + a.aderencia.lacunas.length >= 0 && (
          <table className="tbl">
            <thead><tr><th>Critério</th><th>Peso</th><th>Situação</th><th style={{ width: '34%' }}>Nota</th></tr></thead>
            <tbody>
              {[...a.aderencia.fortes, ...a.aderencia.lacunas, ...a.aderencia.ausentes]
                .concat([])
                .sort((x, y) => y.peso - x.peso)
                .map((c) => (
                  <tr key={c.id} style={{ cursor: 'default' }}>
                    <td data-l="Critério">{c.label}</td>
                    <td data-l="Peso">{c.peso}%</td>
                    <td data-l="Situação">
                      {c.score === null
                        ? <Badge cor="var(--amber)">dado ausente</Badge>
                        : c.score >= 75 ? <Badge cor="var(--teal)">forte</Badge>
                          : c.score < 50 ? <Badge cor="var(--danger)">lacuna</Badge>
                            : <Badge cor="var(--tx2)">parcial</Badge>}
                    </td>
                    <td data-l="Nota">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <b style={{ width: 30, fontWeight: 700 }}>{c.score ?? '—'}</b>
                        <div style={{ flex: 1, minWidth: 60 }}>
                          <Barra valor={c.score ?? 0} cor={c.score === null ? 'var(--amber)' : corAderencia(c.score)} altura={5} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        <Lista titulo="Pontos fortes" cor="var(--teal)" itens={ad.fortes.map((c) => `${c.label} — ${c.score}`)} vazio="Nenhum critério acima de 75." />
        <Lista titulo="Lacunas" cor="var(--danger)" itens={ad.lacunas.map((c) => `${c.label} — ${c.score}`)} vazio="Nenhuma lacuna crítica." />
        <Lista titulo="Ações para aumentar a aderência" cor="var(--amber)"
          itens={ad.ausentes.map((c) => `Informar ${c.label.toLowerCase()} (vale ${c.peso} pontos)`)}
          vazio="Todos os critérios têm dado." />
      </div>
    </>
  )
}

function Lista({ titulo, cor, itens, vazio }: { titulo: string; cor: string; itens: string[]; vazio: string }) {
  return (
    <div className="card card-p">
      <div className="sec-h"><h2 style={{ color: cor }}>{titulo}</h2></div>
      {itens.length === 0 ? <p style={{ fontSize: 13, color: 'var(--tx3)', margin: 0 }}>{vazio}</p> : (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7 }}>
          {itens.map((i, k) => <li key={k}>{i}</li>)}
        </ul>
      )}
    </div>
  )
}

/* ============================ DOCUMENTOS ============================ */

function AbaDocumentos({ docs }: { docs: DocumentoExigido[] }) {
  if (docs.length === 0) {
    return <Vazio titulo="Checklist ainda não gerado" texto="O checklist documental é gerado a partir da análise do edital (Lote 2). Nesta oportunidade demonstrativa ele não foi produzido." />
  }
  const concluidos = docs.filter((d) => d.status === 'concluido').length
  const criticosPendentes = docs.filter((d) => d.obrigatorio && d.riscoInabilitacao === 'alto' && d.status !== 'concluido')
  return (
    <>
      <div className="card card-p" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <b>{concluidos} de {docs.length} documentos concluídos</b>
          {criticosPendentes.length > 0 && (
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
              {criticosPendentes.length} com risco alto de inabilitação
            </span>
          )}
        </div>
        <Barra valor={(concluidos / docs.length) * 100} cor="var(--teal)" altura={7} />
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Documento</th><th>Categoria</th><th>Responsável</th><th>Prazo</th><th>Status</th><th>Inabilitação</th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} style={{ cursor: 'default' }}>
                  <td data-l="Documento">
                    <b style={{ fontWeight: 600 }}>{d.nome}</b>
                    {d.obrigatorio && <span style={{ fontSize: 10.5, color: 'var(--danger)', marginLeft: 6 }}>obrigatório</span>}
                    {d.obs && <span style={{ display: 'block', fontSize: 11, color: 'var(--tx3)' }}>{d.obs}</span>}
                  </td>
                  <td data-l="Categoria">{d.categoria}</td>
                  <td data-l="Responsável">{d.responsavel ?? '—'}</td>
                  <td data-l="Prazo">{d.prazo ? fData(d.prazo) : '—'}</td>
                  <td data-l="Status"><Badge cor={STATUS_DOC[d.status].cor}>{STATUS_DOC[d.status].label}</Badge></td>
                  <td data-l="Inabilitação">
                    <span style={{ fontSize: 12, color: d.riscoInabilitacao === 'alto' ? 'var(--danger)' : d.riscoInabilitacao === 'medio' ? 'var(--amber)' : 'var(--tx3)' }}>
                      {d.riscoInabilitacao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ============================ PRAZOS ============================ */

function AbaPrazos({ prazos }: { prazos: Prazo[] }) {
  if (prazos.length === 0) return <Vazio titulo="Sem linha do tempo" texto="Os marcos do edital são extraídos na análise documental (Lote 2)." />
  const hoje = Date.now()
  return (
    <div className="card card-p">
      {prazos.map((p, i) => {
        const t = new Date(p.data + 'T12:00:00').getTime()
        const passou = t < hoje
        const dias = Math.ceil((t - hoje) / 86_400_000)
        return (
          <div key={p.id} style={{ display: 'flex', gap: 14, paddingBottom: i === prazos.length - 1 ? 0 : 18, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{
                width: 11, height: 11, borderRadius: '50%', flex: 'none', marginTop: 4,
                background: passou ? 'var(--teal)' : 'var(--card)',
                border: `2px solid ${passou ? 'var(--teal)' : dias <= 7 ? 'var(--danger)' : 'var(--line2)'}`,
              }} />
              {i < prazos.length - 1 && <span style={{ width: 2, flex: 1, background: 'var(--line)', marginTop: 3 }} />}
            </div>
            <div style={{ paddingBottom: 4 }}>
              <b style={{ fontSize: 13.5, fontWeight: 600 }}>{p.label}</b>
              <div style={{ fontSize: 12, color: passou ? 'var(--tx3)' : corPrazo(dias) }}>
                {fData(p.data)} · {passou ? 'concluído' : rotuloPrazo(dias)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ============================ RISCOS ============================ */

function AbaRiscos({ a }: { a: Avaliacao }) {
  const r = a.risco
  if (r.porCategoria.length === 0) return <Vazio titulo="Nenhum risco registrado" texto="Riscos são registrados manualmente ou sugeridos pela análise documental." />
  return (
    <>
      <div className="card card-p" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: corRisco(r.nivel) }}>{r.score}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>risco {r.nivel}</div>
          </div>
          <div style={{ flex: '1 1 260px', minWidth: 240 }}>
            {r.porCategoria.map((c) => (
              <div key={c.categoria} style={{ marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span>{c.categoria}</span><b>{c.score}</b>
                </div>
                <Barra valor={c.score} cor={corRisco(c.score < 25 ? 'baixo' : c.score < 50 ? 'moderado' : c.score < 75 ? 'alto' : 'critico')} altura={5} />
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '12px 0 0', lineHeight: 1.5 }}>
          A nota da categoria é o <b>pior</b> item dela, não a média: um risco de inabilitação não pode
          ser diluído por outros irrelevantes ao lado.
        </p>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Risco</th><th>Categoria</th><th>P × I</th><th>Criticidade</th><th>Evidência</th><th>Mitigação</th></tr></thead>
            <tbody>
              {r.porCategoria.flatMap((c) => c.itens).sort((x, y) => criticidade(y) - criticidade(x)).map((i) => (
                <tr key={i.id} style={{ cursor: 'default' }}>
                  <td data-l="Risco" style={{ maxWidth: 280 }}><b style={{ fontWeight: 500 }}>{i.descricao}</b></td>
                  <td data-l="Categoria">{i.categoria}</td>
                  <td data-l="P × I">{i.probabilidade} × {i.impacto}</td>
                  <td data-l="Criticidade">
                    <Badge cor={criticidade(i) >= 15 ? 'var(--danger)' : criticidade(i) >= 8 ? 'var(--amber)' : 'var(--teal)'}>
                      {criticidade(i)}/25
                    </Badge>
                  </td>
                  <td data-l="Evidência" style={{ fontSize: 12, color: 'var(--tx2)' }}>{i.evidencia}</td>
                  <td data-l="Mitigação" style={{ fontSize: 12, color: 'var(--tx2)', maxWidth: 240 }}>{i.mitigacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ============================ VIABILIDADE ============================ */

function AbaViabilidade({ o, a }: { o: Oportunidade; a: Avaliacao }) {
  if (!a.viabilidade || !o.viabilidade) {
    return <Vazio titulo="Viabilidade não calculada" texto="Informe receita, custos, tributos e logística para simular margem, valor esperado e cenários." />
  }
  const v = o.viabilidade
  const r = a.viabilidade
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 14 }}>
        <div className="card card-p">
          <div className="sec-h"><h2>Composição</h2></div>
          {[
            ['Receita', v.receita, 'var(--teal)'],
            ['Custos diretos', -v.custos, 'var(--tx2)'],
            ['Tributos', -v.tributos, 'var(--tx2)'],
            ['Logística', -v.logistica, 'var(--tx2)'],
          ].map(([rot, val, cor]) => (
            <div key={rot as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <span style={{ color: 'var(--tx2)' }}>{rot as string}</span>
              <b style={{ fontWeight: 600, color: cor as string }}>{moeda(val as number, o.moeda)}</b>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 11, fontSize: 15 }}>
            <b>Margem</b>
            <b style={{ color: r.margem > 0 ? 'var(--teal)' : 'var(--danger)' }}>
              {moeda(r.margem, o.moeda)} · {r.margemPct.toFixed(1)}%
            </b>
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', lineHeight: 1.6 }}>
            Capital de giro necessário: <b>{moeda(v.capitalGiro, o.moeda)}</b><br />
            Prazo de recebimento: <b>{v.prazoRecebimentoDias} dias</b>
          </div>
        </div>

        <div className="card card-p">
          <div className="sec-h">
            <h2>Cenários</h2>
            <span className="sub">probabilidade × margem</span>
          </div>
          {r.cenarios.map((c) => (
            <div key={c.nome} style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <b style={{ fontWeight: 600 }}>{c.nome}</b>
                <span style={{ color: 'var(--tx2)' }}>{pct(c.p * 100)} de chance</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: 'var(--tx2)' }}>margem {moeda(c.margem, o.moeda, true)}</span>
                <b>{moeda(c.valorEsperado, o.moeda, true)} esperado</b>
              </div>
            </div>
          ))}
          <div style={{ paddingTop: 12, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <b>Valor esperado (base)</b>
            <b style={{ color: 'var(--brand)' }}>{moeda(r.valorEsperado, o.moeda)}</b>
          </div>
        </div>
      </div>
      <FaixaLegal />
    </>
  )
}

/* ============================ SWOT / PESTEL ============================ */

const SWOT_META = {
  forca: { label: 'Forças', cor: 'var(--teal)' },
  fraqueza: { label: 'Fraquezas', cor: 'var(--danger)' },
  oportunidade: { label: 'Oportunidades', cor: 'var(--brand)' },
  ameaca: { label: 'Ameaças', cor: 'var(--amber)' },
} as const

function AbaSwot({ itens }: { itens: ItemSwot[] }) {
  if (itens.length === 0) return <Vazio titulo="SWOT não iniciada" texto="A matriz é editável e aceita sugestão automática, mas exige validação humana antes de ser aprovada." />
  const pendentes = itens.filter((i) => !i.validado).length
  return (
    <>
      {pendentes > 0 && (
        <div className="faixa faixa-demo" style={{ background: 'rgba(46,111,184,.09)', color: 'var(--info)', borderColor: 'rgba(46,111,184,.28)' }}>
          <span>◔</span>{pendentes} item(ns) aguardando validação humana — a análise não pode ser marcada como aprovada.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        {(Object.keys(SWOT_META) as (keyof typeof SWOT_META)[]).map((cat) => (
          <div key={cat} className="card card-p">
            <div className="sec-h"><h2 style={{ color: SWOT_META[cat].cor }}>{SWOT_META[cat].label}</h2></div>
            {itens.filter((i) => i.categoria === cat).map((i) => (
              <div key={i.id} style={{ padding: '9px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 13, lineHeight: 1.45 }}>{i.descricao}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--tx3)' }}>impacto {i.impacto}/5</span>
                  {i.validado
                    ? <Badge cor="var(--teal)">validado</Badge>
                    : <Badge cor="var(--amber)">a validar</Badge>}
                </div>
                {i.recomendacao && <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 5 }}>→ {i.recomendacao}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

const PESTEL_LABEL: Record<string, string> = {
  politico: 'Político', economico: 'Econômico', social: 'Social',
  tecnologico: 'Tecnológico', ambiental: 'Ambiental', legal: 'Legal',
}

function AbaPestel({ itens }: { itens: FatorPestel[] }) {
  if (itens.length === 0) return <Vazio titulo="PESTEL não iniciada" texto="A análise pode ser feita por país e por oportunidade." />
  return (
    <div className="card">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Categoria</th><th>Fator</th><th>Tendência</th><th>Impacto</th><th>Incerteza</th><th>Fonte</th></tr></thead>
          <tbody>
            {itens.map((f) => (
              <tr key={f.id} style={{ cursor: 'default' }}>
                <td data-l="Categoria"><b style={{ fontWeight: 600 }}>{PESTEL_LABEL[f.categoria]}</b></td>
                <td data-l="Fator" style={{ maxWidth: 330 }}>{f.descricao}</td>
                <td data-l="Tendência">
                  <Badge cor={f.tendencia === 'melhora' ? 'var(--teal)' : f.tendencia === 'piora' ? 'var(--danger)' : 'var(--tx2)'}>
                    {f.tendencia}
                  </Badge>
                </td>
                <td data-l="Impacto">
                  <b style={{ color: f.impacto > 0 ? 'var(--teal)' : f.impacto < 0 ? 'var(--danger)' : 'var(--tx2)' }}>
                    {f.impacto > 0 ? '+' : ''}{f.impacto}
                  </b>
                </td>
                <td data-l="Incerteza">{f.incerteza}</td>
                <td data-l="Fonte" style={{ fontSize: 12, color: 'var(--tx2)' }}>{f.fonte}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ============================ FONTES ============================ */

function AbaFontes({ o }: { o: Oportunidade }) {
  if (o.camposExtraidos.length === 0) {
    return <Vazio titulo="Nenhum campo extraído" texto="Os campos extraídos de documento aparecem aqui com origem, página, trecho e grau de confiança. A extração é o Lote 2." />
  }
  return (
    <>
      <div className="faixa faixa-legal">
        <span>⌖</span>Nenhuma informação extraída é exibida sem origem consultável — documento, página, seção e trecho.
      </div>
      {o.camposExtraidos.map((c, i) => (
        <div key={i} className="card card-p" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', fontWeight: 600 }}>{c.campo}</div>
              <b style={{ fontSize: 14, fontWeight: 600 }}>{c.valor}</b>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Badge cor={c.evidencia.confianca >= 0.9 ? 'var(--teal)' : c.evidencia.confianca >= 0.75 ? 'var(--amber)' : 'var(--danger)'}>
                confiança {Math.round(c.evidencia.confianca * 100)}%
              </Badge>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>
                {c.evidencia.revisadoPor ? `revisado por ${c.evidencia.revisadoPor}` : 'não revisado'}
              </div>
            </div>
          </div>
          {/* Citação do documento: filete discreto, no tom da linha — é trecho de
              edital, não destaque. §2 dos padrões VIZIO: pouco acento, muito respiro. */}
          <div style={{ background: 'var(--bg2)', borderLeft: '2px solid var(--line2)', borderRadius: '0 8px 8px 0', padding: '10px 13px', fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.55 }}>
            “{c.evidencia.trecho}”
            <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6 }}>
              {c.evidencia.documento} · p. {c.evidencia.pagina}{c.evidencia.secao ? ` · ${c.evidencia.secao}` : ''}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

/* ============================ DECISÃO ============================ */

function AbaDecisao({ o, a, onRegistrar }: { o: Oportunidade; a: Avaliacao; onRegistrar: () => void }) {
  return (
    <>
      <div className="card card-p" style={{ marginBottom: 14 }}>
        <div className="sec-h"><h2>Decisão registrada</h2></div>
        {o.decisao ? (
          <>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--brand)', marginBottom: 6 }}>
              {DECISOES.find((d) => d.id === o.decisao)?.label}
            </div>
            <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 10px', lineHeight: 1.55 }}>{o.decisaoJustificativa}</p>
            <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Responsável: {o.responsavel}</div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: 0 }}>
            Ainda não há decisão registrada. O sistema recomenda <b>{a.recomendacao.titulo}</b>, mas a decisão é humana.
          </p>
        )}
        <button className="b nao-imprime" style={{ marginTop: 14 }} onClick={onRegistrar}>
          {o.decisao ? 'Registrar nova decisão' : 'Registrar decisão'}
        </button>
      </div>
      <div className="faixa faixa-legal">
        <span>§</span>Toda decisão exige justificativa e responsável, e fica registrada — decisão revista gera novo registro, nunca sobrescreve o anterior.
      </div>
    </>
  )
}

function ModalDecisao({ sugestao, responsavelPadrao, onFechar, onSalvar }: {
  sugestao: Decisao; responsavelPadrao: string
  onFechar: () => void; onSalvar: (d: Decisao, j: string, r: string) => void
}) {
  const [decisao, setDecisao] = useState<Decisao>(sugestao)
  const [justificativa, setJustificativa] = useState('')
  const [responsavel, setResponsavel] = useState(responsavelPadrao)
  const valido = justificativa.trim().length >= 15 && responsavel.trim().length > 0

  return (
    <Modal titulo="Registrar decisão" onFechar={onFechar}>
      <Campo label="Decisão">
        <select className="inp" value={decisao} onChange={(e) => setDecisao(e.target.value as Decisao)}>
          {DECISOES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </Campo>
      <Campo label="Justificativa" dica="Mínimo de 15 caracteres — é o que fica no histórico e no relatório.">
        <textarea className="inp" value={justificativa} onChange={(e) => setJustificativa(e.target.value)}
          placeholder="Por que esta é a decisão, com base em quê…" />
      </Campo>
      <Campo label="Responsável">
        <input className="inp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
      </Campo>
      <Rodape>
        <button className="b-ghost" onClick={onFechar}>Cancelar</button>
        <button className="b" disabled={!valido} onClick={() => onSalvar(decisao, justificativa.trim(), responsavel.trim())}>
          Registrar
        </button>
      </Rodape>
    </Modal>
  )
}
