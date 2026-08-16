import { useState } from 'react'
import { useDados } from '../lib/dados'
import { PAISES } from '../lib/demo'
import { PESOS_ADERENCIA_PADRAO, ROTULOS_ADERENCIA } from '../lib/scoring'
import type { Moeda } from '../lib/tipos'
import type { NovaOportunidade as Nova } from '../lib/mapear'
import { Campo, Modal, Rodape, useToast } from '../ui/kit'

const MOEDAS: Moeda[] = ['BRL', 'USD', 'EUR', 'GBP']
const CRITERIOS = Object.keys(PESOS_ADERENCIA_PADRAO)

/* Cadastro manual (§13.1 do briefing). Enquanto a importação documental
   não existe, é por aqui que edital entra no sistema. */
export default function NovaOportunidade({ onFechar }: { onFechar: () => void }) {
  const { criarOportunidade } = useDados()
  const toast = useToast()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [f, setF] = useState({
    titulo: '', comprador: '', paisId: 'br', tipo: '',
    produtos: '', valor: '', moeda: 'BRL' as Moeda,
    publicacao: '', prazo: '', fonte: '', fonteUrl: '',
    financiamento: '', exigeParceiroLocal: false, concorrentes: '',
  })
  const [comp, setComp] = useState<Record<string, string>>({})

  const set = (k: keyof typeof f, v: unknown) => setF((s) => ({ ...s, [k]: v }))
  const valido = f.titulo.trim().length >= 5 && f.comprador.trim().length >= 3
    && Number(f.valor) > 0 && !!f.prazo

  async function salvar() {
    setErro(null); setOcupado(true)
    const componentes: Record<string, number | null> = {}
    for (const c of CRITERIOS) {
      const v = comp[c]
      componentes[c] = v === undefined || v === '' ? null : Number(v)
    }
    const nova: Nova = {
      titulo: f.titulo, comprador: f.comprador, paisId: f.paisId,
      tipo: f.tipo, produtos: f.produtos.split(',').map((p) => p.trim()).filter(Boolean),
      valor: Number(f.valor), moeda: f.moeda,
      publicacao: f.publicacao, prazo: f.prazo,
      fonte: f.fonte, fonteUrl: f.fonteUrl, financiamento: f.financiamento,
      exigeParceiroLocal: f.exigeParceiroLocal,
      concorrentesEstimados: f.concorrentes === '' ? null : Number(f.concorrentes),
      componentes,
    }
    const msg = await criarOportunidade(nova)
    setOcupado(false)
    if (msg) { setErro(msg); return }
    toast('Oportunidade cadastrada.')
    onFechar()
  }

  return (
    <Modal titulo="Cadastrar oportunidade" largura={640} onFechar={onFechar}>
      {erro && (
        <div role="alert" style={{ border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, marginBottom: 14 }}>
          {erro}
        </div>
      )}

      <Campo label="Objeto do edital">
        <input className="inp" autoFocus value={f.titulo}
          onChange={(e) => set('titulo', e.target.value)}
          placeholder="Ex.: Modernização de 42.000 pontos com telegestão" />
      </Campo>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        <Campo label="Órgão comprador">
          <input className="inp" value={f.comprador} onChange={(e) => set('comprador', e.target.value)} />
        </Campo>
        <Campo label="País">
          <select className="inp" value={f.paisId} onChange={(e) => set('paisId', e.target.value)}>
            {PAISES.map((p) => <option key={p.id} value={p.id}>{p.bandeira} {p.nome}</option>)}
          </select>
        </Campo>
        <Campo label="Tipo de contratação">
          <input className="inp" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}
            placeholder="Concorrência, pregão…" />
        </Campo>
        <Campo label="Valor estimado">
          <input className="inp" type="number" min={0} value={f.valor}
            onChange={(e) => set('valor', e.target.value)} />
        </Campo>
        <Campo label="Moeda">
          <select className="inp" value={f.moeda} onChange={(e) => set('moeda', e.target.value)}>
            {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Campo>
        <Campo label="Publicação">
          <input className="inp" type="date" value={f.publicacao} onChange={(e) => set('publicacao', e.target.value)} />
        </Campo>
        <Campo label="Prazo de entrega da proposta">
          <input className="inp" type="date" value={f.prazo} onChange={(e) => set('prazo', e.target.value)} />
        </Campo>
        <Campo label="Concorrentes estimados" dica="Em branco, o modelo assume 5 e reduz a confiança.">
          <input className="inp" type="number" min={1} value={f.concorrentes}
            onChange={(e) => set('concorrentes', e.target.value)} />
        </Campo>
      </div>

      <Campo label="Produtos" dica="Separados por vírgula.">
        <input className="inp" value={f.produtos} onChange={(e) => set('produtos', e.target.value)}
          placeholder="Luminárias LED, Telegestão" />
      </Campo>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        <Campo label="Fonte">
          <input className="inp" value={f.fonte} onChange={(e) => set('fonte', e.target.value)}
            placeholder="Portal oficial, diário…" />
        </Campo>
        <Campo label="URL da fonte">
          <input className="inp" type="url" value={f.fonteUrl} onChange={(e) => set('fonteUrl', e.target.value)} />
        </Campo>
        <Campo label="Financiamento">
          <input className="inp" value={f.financiamento} onChange={(e) => set('financiamento', e.target.value)}
            placeholder="Orçamento municipal, banco multilateral…" />
        </Campo>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, margin: '2px 0 18px', cursor: 'pointer' }}>
        <input type="checkbox" checked={f.exigeParceiroLocal}
          onChange={(e) => set('exigeParceiroLocal', e.target.checked)} />
        O edital exige presença ou parceiro local
      </label>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Aderência (0 a 100)</div>
        <p style={{ fontSize: 12, color: 'var(--tx2)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Deixe em branco o que ainda não souber. Critério sem dado <b>não</b> vira nota cheia —
          entra como ausente e derruba a confiança do cálculo, que é o comportamento correto.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
          {CRITERIOS.map((c) => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <span style={{ flex: 1, color: 'var(--tx2)' }}>{ROTULOS_ADERENCIA[c]}</span>
              <input className="inp" type="number" min={0} max={100} value={comp[c] ?? ''}
                onChange={(e) => setComp((s) => ({ ...s, [c]: e.target.value }))}
                style={{ width: 66, height: 32, padding: '4px 8px', textAlign: 'center' }}
                placeholder="—" />
            </label>
          ))}
        </div>
      </div>

      <Rodape>
        <button className="b-ghost" onClick={onFechar}>Cancelar</button>
        <button className="b" disabled={!valido || ocupado} onClick={() => void salvar()}>
          {ocupado ? 'Salvando…' : 'Cadastrar'}
        </button>
      </Rodape>
    </Modal>
  )
}
