import { useState } from 'react'
import { MODO_DEMO } from '../app.config'
import { FONTES, ROTULO_ESTADO, ROTULO_TIPO, type EstadoFonte, type Fonte } from '../lib/fontes'
import { Badge, FaixaDemo, Stat } from '../ui/kit'

const ETAPAS_PIPELINE = [
  { n: 1, nome: 'Agendador', desc: 'Uma tarefa por fonte, na cadência dela. Portal que publica de hora em hora não precisa ser consultado a cada minuto.' },
  { n: 2, nome: 'Conector', desc: 'Fala o dialeto daquele portal: autenticação, paginação, formato, idioma. Um conector por fonte — não existe adaptador universal.' },
  { n: 3, nome: 'Normalização', desc: 'Traduz para o modelo do X369life: objeto, comprador, país, valor, moeda, prazo, produtos.' },
  { n: 4, nome: 'Deduplicação', desc: 'O mesmo edital costuma aparecer em duas fontes. Entra uma vez, com as duas origens registradas.' },
  { n: 5, nome: 'Triagem', desc: 'Filtra pelo perfil da organização: país de interesse, faixa de valor, categoria de produto. O resto não polui a base.' },
  { n: 6, nome: 'Aderência e risco', desc: 'Cada oportunidade nova já entra pontuada — e já dispara alerta se for compatível.' },
]

export default function Fontes() {
  const [detalhe, setDetalhe] = useState<Fonte | null>(null)

  const porEstado = (e: EstadoFonte) => FONTES.filter((f) => f.estado === e).length
  const paises = new Set(FONTES.filter((f) => f.paisId).map((f) => f.paisId)).size

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h">
        <h1>Fontes e coleta automática</h1>
        <p>De onde vêm os editais. Cada portal é um conector próprio — o estado de cada um é declarado, nunca presumido.</p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 18 }}>
        <Stat rotulo="Fontes catalogadas" valor={FONTES.length} sub={`cobrindo ${paises} países de interesse`} />
        <Stat rotulo="Coletando" valor={porEstado('coletando')} sub="conectores ativos" cor={porEstado('coletando') > 0 ? 'var(--teal)' : undefined} />
        <Stat rotulo="Prontas para conectar" valor={porEstado('disponivel')} sub="API pública confirmada" cor="var(--info)" />
        <Stat rotulo="A validar" valor={porEstado('a_validar') + porEstado('sem_api')} sub="endpoint ou condição de uso pendente" cor="var(--amber)" />
      </div>

      <div className="faixa faixa-demo" style={{ marginBottom: 18 }}>
        <span>⚠</span>
        Nenhum conector está coletando: o backend ainda não foi provisionado. Enquanto isso, oportunidade entra por cadastro manual ou importação de documento.
      </div>

      {/* ---------- como a coleta funciona ---------- */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div className="sec-h">
          <h2>Como a alimentação automática funciona</h2>
          <span className="sub">seis etapas, uma tarefa agendada por fonte</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          {ETAPAS_PIPELINE.map((e) => (
            <div key={e.n} style={{ display: 'flex', gap: 11 }}>
              <span style={{
                width: 24, height: 24, borderRadius: 7, flex: 'none', display: 'grid', placeItems: 'center',
                background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 12, fontWeight: 700,
              }}>{e.n}</span>
              <div>
                <b style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 2 }}>{e.nome}</b>
                <span style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.5 }}>{e.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--tx3)', margin: '16px 0 0', lineHeight: 1.6, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <b style={{ color: 'var(--tx2)' }}>Sobre “tempo real”:</b> não existe uma API única mundial de editais.
          O que se entrega é <b>coleta agendada por conector</b>, com o carimbo de última sincronização visível em
          cada fonte — latência de minutos a horas conforme o portal, não streaming. Prometer streaming aqui seria
          prometer o que nenhum portal oferece.
        </p>
      </div>

      {/* ---------- catálogo ---------- */}
      <div className="card">
        <div className="card-p" style={{ paddingBottom: 0 }}>
          <div className="sec-h">
            <h2>Catálogo de fontes</h2>
            <span className="sub">ordenado pela hierarquia de confiabilidade do briefing</span>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Fonte</th><th>Abrangência</th><th>Tipo</th><th>Estado</th><th>Autenticação</th><th>Cadência</th></tr>
            </thead>
            <tbody>
              {[...FONTES].sort((a, b) => a.prioridade - b.prioridade).map((f) => (
                <tr key={f.id} onClick={() => setDetalhe(detalhe?.id === f.id ? null : f)}>
                  <td data-l="Fonte">
                    {/* O endereço estava escondido atrás de um clique na linha.
                        O nome sendo o link poupa esse passo e deixa claro que
                        a fonte existe fora do sistema. */}
                    {f.url ? (
                      <a className="link-ext" href={f.url} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontWeight: 600, display: 'inline-block', lineHeight: 1.35 }}>
                        {f.nome}
                      </a>
                    ) : (
                      <b style={{ fontWeight: 600, display: 'block', lineHeight: 1.35 }}>{f.nome}</b>
                    )}
                    <span style={{ fontSize: 11.5, color: 'var(--tx3)', display: 'block' }}>{f.organizacao}</span>
                  </td>
                  <td data-l="Abrangência" style={{ color: 'var(--tx2)' }}>{f.abrangencia}</td>
                  <td data-l="Tipo" style={{ fontSize: 12, color: 'var(--tx2)' }}>{ROTULO_TIPO[f.tipo]}</td>
                  <td data-l="Estado"><Badge cor={ROTULO_ESTADO[f.estado].cor}>{ROTULO_ESTADO[f.estado].label}</Badge></td>
                  <td data-l="Autenticação" style={{ fontSize: 12, color: 'var(--tx2)' }}>
                    {f.autenticacao === 'nenhuma' ? 'Aberta' : f.autenticacao === 'registro' ? 'Registro' : f.autenticacao === 'chave' ? 'Chave' : 'A verificar'}
                  </td>
                  <td data-l="Cadência" style={{ fontSize: 12, color: 'var(--tx2)' }}>{f.cadenciaSugerida}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detalhe && (
        <div className="card card-p" style={{ marginTop: 14, borderLeft: `3px solid ${ROTULO_ESTADO[detalhe.estado].cor}` }}>
          <div className="sec-h">
            <h2>{detalhe.nome}</h2>
            <Badge cor={ROTULO_ESTADO[detalhe.estado].cor}>{ROTULO_ESTADO[detalhe.estado].label}</Badge>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--tx2)', margin: '0 0 10px', lineHeight: 1.6, maxWidth: '72ch' }}>
            {detalhe.nota}
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--tx3)', margin: '0 0 10px' }}>
            {ROTULO_ESTADO[detalhe.estado].explica}
          </p>
          {detalhe.url && (
            <a className="link-ext" href={detalhe.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
              {detalhe.url}
            </a>
          )}
        </div>
      )}

      <div className="faixa faixa-legal" style={{ marginTop: 16 }}>
        <span>§</span>
        Coleta respeita os termos de uso de cada portal. Onde não há API nem autorização de acesso programático,
        o sistema monitora e pede confirmação humana — nunca raspagem silenciosa.
      </div>
    </>
  )
}
