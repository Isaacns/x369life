import { useMemo, useState } from 'react'
import { IA, MODO_DEMO } from '../app.config'
import { comPesos, useDados } from '../lib/dados'
import { estadoIA } from '../lib/ia'
import { avaliar } from '../lib/scoring'
import {
  cruzarPadroes, CORES_SEVERIDADE, ROTULO_SEVERIDADE,
  type Achado, type Severidade,
} from '../lib/padroes'
import { moeda } from '../lib/formato'
import { Badge, FaixaDemo, Vazio } from '../ui/kit'

const FILTROS: (Severidade | 'todos')[] = ['todos', 'critico', 'atencao', 'oportunidade', 'informativo']

export default function Inteligencia() {
  const { oportunidades, perfilOrg, pesos } = useDados()
  const [filtro, setFiltro] = useState<Severidade | 'todos'>('todos')
  const ia = estadoIA()

  const achados = useMemo(() => {
    const linhas = oportunidades.map((o) => ({ o, a: avaliar(comPesos(o, pesos), perfilOrg) }))
    return cruzarPadroes(linhas, perfilOrg)
  }, [oportunidades, perfilOrg, pesos])

  const visiveis = filtro === 'todos' ? achados : achados.filter((a) => a.severidade === filtro)
  const contagem = (s: Severidade) => achados.filter((a) => a.severidade === s).length
  const valorTotalEmJogo = achados
    .filter((a) => a.severidade === 'critico' || a.severidade === 'oportunidade')
    .reduce((s, a) => s + (a.valorEmJogo ?? 0), 0)

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h">
        <h1>Inteligência</h1>
        <p>Cruzamentos sobre a carteira inteira — o que só aparece olhando todos os editais juntos, nunca um por um.</p>
      </div>

      {/* ---------- as duas camadas, explicadas ---------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 18 }}>
        <div className="card card-p" style={{ borderLeft: '3px solid var(--teal)' }}>
          <div className="sec-h">
            <h2>Camada 1 · Cruzamento de dados</h2>
            <Badge cor="var(--teal)">ligada</Badge>
          </div>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: 0, lineHeight: 1.6 }}>
            Roda agora, sem chave e sem custo. Cruza concentração de carteira, reincidência de risco,
            lacunas de capacidade, aglomeração de prazos, barreiras de entrada e qualidade do dado.
            Cada achado abaixo carrega os números que o produziram — <b>nada aqui é redação, é conta</b>.
          </p>
        </div>

        <div className="card card-p" style={{ borderLeft: `3px solid ${ia.ativa ? 'var(--teal)' : 'var(--amber)'}` }}>
          <div className="sec-h">
            <h2>Camada 2 · Leitura do Claude</h2>
            <Badge cor={ia.ativa ? 'var(--teal)' : 'var(--amber)'}>{ia.ativa ? 'ligada' : 'dormente'}</Badge>
          </div>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 10px', lineHeight: 1.6 }}>
            Recebe estes achados <i>mais</i> o texto integral dos editais e escreve a interpretação:
            por que os padrões aparecem juntos, o que eles sugerem sobre o mercado e qual movimento faz
            mais sentido no trimestre.
          </p>
          <p style={{ fontSize: 12, color: 'var(--tx3)', margin: 0, lineHeight: 1.55 }}>
            {ia.texto}
          </p>
        </div>
      </div>

      {/* ---------- resumo ---------- */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTROS.map((f) => (
            <button key={f} className={'chip' + (filtro === f ? ' on' : '')} onClick={() => setFiltro(f)}>
              {f === 'todos' ? `Todos · ${achados.length}` : `${ROTULO_SEVERIDADE[f]} · ${contagem(f)}`}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          {valorTotalEmJogo > 0 && (
            <span style={{ fontSize: 12.5, color: 'var(--tx2)' }}>
              Valor sob influência destes achados: <b style={{ color: 'var(--tx)' }}>{moeda(valorTotalEmJogo, 'BRL', true)}</b>
            </span>
          )}
        </div>
      </div>

      {visiveis.length === 0 ? (
        <Vazio titulo="Nenhum padrão nesta categoria"
          texto="Com mais oportunidades e mais disputas fechadas, o cruzamento fica mais rico — e os padrões deixam de ser ruído." />
      ) : (
        visiveis.map((a) => <Cartao key={a.id} achado={a} />)
      )}

      {!ia.ativa && (
        <div className="card card-p" style={{ marginTop: 16, background: 'var(--bg2)' }}>
          <div className="sec-h"><h2>O que a camada 2 acrescenta quando ligar</h2></div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--tx2)', lineHeight: 1.75 }}>
            <li><b>Leitura conjunta:</b> por que a concentração num país e a lacuna de parceiro local são o <i>mesmo</i> problema, e não dois.</li>
            <li><b>Cruzamento com o texto do edital:</b> cláusula que se repete entre compradores diferentes e sinaliza tendência regulatória.</li>
            <li><b>Comparação entre editais:</b> especificação idêntica em dois órgãos distintos costuma indicar o mesmo projetista — e o mesmo concorrente favorecido.</li>
            <li><b>Antecipação:</b> a partir do histórico de publicação de cada comprador, quando o próximo edital tende a sair.</li>
          </ul>
          <p style={{ fontSize: 12, color: 'var(--tx3)', margin: '12px 0 0', lineHeight: 1.55 }}>
            Ligar exige o backend provisionado e a chave gravada no ambiente do Supabase — nunca no navegador.
            Modelo previsto: <b>{IA.modelo}</b>. Passo a passo em <code>docs/ATIVAR-IA-CLAUDE.md</code>.
          </p>
        </div>
      )}
    </>
  )
}

function Cartao({ achado }: { achado: Achado }) {
  const cor = CORES_SEVERIDADE[achado.severidade]
  return (
    <div className="card card-p" style={{ marginBottom: 12, borderLeft: `3px solid ${cor}` }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <Badge cor={cor}>{ROTULO_SEVERIDADE[achado.severidade]}</Badge>
        <span style={{ fontSize: 11.5, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>
          {achado.tipo}
        </span>
        <span style={{ flex: 1 }} />
        {achado.valorEmJogo !== undefined && achado.valorEmJogo > 0 && (
          <span style={{ fontSize: 13, fontWeight: 700 }}>{moeda(achado.valorEmJogo, 'BRL', true)}</span>
        )}
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35, marginBottom: 6 }}>{achado.titulo}</h3>
      <p style={{ fontSize: 13.5, color: 'var(--tx2)', margin: '0 0 12px', lineHeight: 1.6, maxWidth: '72ch' }}>
        {achado.detalhe}
      </p>

      <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '11px 13px', marginBottom: 12 }}>
        <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--tx3)', fontWeight: 700, marginBottom: 6 }}>
          Números que sustentam
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.65 }}>
          {achado.evidencias.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', fontSize: 13.5, lineHeight: 1.55 }}>
          <span style={{ color: cor, fontWeight: 700 }}>→ </span>{achado.recomendacao}
        </div>
        <span style={{ fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap', paddingTop: 3 }}>
          amostra: {achado.amostra}
        </span>
      </div>
    </div>
  )
}
