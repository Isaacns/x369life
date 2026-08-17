import { useCallback, useEffect, useState } from 'react'
import { MODO_DEMO, type Perfil } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { useDados } from '../lib/dados'
import {
  arquivarProduto, AVISO_NAO_PROVISIONADO, TITULO_NAO_PROVISIONADO, eficaciaDerivada, listarProdutos,
  moduloNaoProvisionado, salvarProduto,
  type NovoProduto, type Produto,
} from '../lib/catalogo'
import { moeda as fmtMoeda } from '../lib/formato'
import { podeEditarModulo } from '../lib/permissoes'
import { Badge, Campo, Carregando, Erro, NaoDisponivel, Modal, Rodape, Stat, useToast, Vazio } from '../ui/kit'

/* ============================================================
   Catálogo de produtos da organização.

   Campo em branco fica em branco. É a mesma regra da aderência: dado ausente
   não vira zero nem estimativa — vira lacuna visível, porque é exatamente ela
   que derruba a confiança da nota quando o edital cobra o número.
   ============================================================ */

const VAZIO: NovoProduto = {
  nome: '', familia: null, modelo: null, fabricante: null,
  potenciaW: null, fluxoLm: null, eficaciaLmW: null, temperaturaK: null, irc: null,
  grauIp: null, grauIk: null, vidaUtilH: null, garantiaMeses: null,
  certificacoes: [], precoReferencia: null, moeda: 'BRL',
  capacidadeMensal: null, observacoes: null, ativo: true,
}

export default function Produtos() {
  const { orgId } = useDados()
  const { usuario } = useAuth()
  const toast = useToast()
  const [itens, setItens] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [semModulo, setSemModulo] = useState(false)
  const [ficha, setFicha] = useState<Produto | 'novo' | null>(null)

  const podeEditar = podeEditarModulo(
    (usuario?.perfil ?? 'visualizador') as Perfil, usuario?.permissoes, 'oportunidades')

  const recarregar = useCallback(async () => {
    if (!orgId) { setCarregando(false); return }
    setCarregando(true); setErro(null); setSemModulo(false)
    try { setItens(await listarProdutos(orgId)) }
    catch (e) {
      if (moduloNaoProvisionado(e)) setSemModulo(true)
      else setErro((e as { message?: string }).message ?? 'Não consegui carregar o catálogo.')
    }
    setCarregando(false)
  }, [orgId])

  useEffect(() => { void recarregar() }, [recarregar])

  if (MODO_DEMO) return <FaixaSemBanco titulo="Produtos" />
  if (carregando) return <Carregando />
  if (semModulo) return <NaoDisponivel titulo={TITULO_NAO_PROVISIONADO} texto={AVISO_NAO_PROVISIONADO} />
  if (erro) return <Erro texto={erro} onTentar={() => void recarregar()} />

  const ativos = itens.filter((p) => p.ativo)
  const completos = itens.filter((p) => p.potenciaW && p.fluxoLm && p.grauIp && p.garantiaMeses).length
  const cobertura = itens.length ? Math.round((completos / itens.length) * 100) : 0

  return (
    <>
      <div className="pg-h" style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1>Produtos</h1>
          <p>O que a sua empresa oferece. É este catálogo que o sistema compara com a especificação de cada edital.</p>
        </div>
        {podeEditar && <button className="b nao-imprime" onClick={() => setFicha('novo')}>+ Novo produto</button>}
      </div>

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <Stat rotulo="Produtos" valor={String(itens.length)} sub="no catálogo" />
        <Stat rotulo="Ativos" valor={String(ativos.length)} sub="disponíveis para proposta" cor="var(--teal)" />
        <Stat rotulo="Ficha técnica completa" valor={`${cobertura}%`}
          sub="potência, fluxo, IP e garantia preenchidos"
          cor={cobertura >= 80 ? 'var(--teal)' : cobertura >= 40 ? 'var(--amber)' : 'var(--danger)'} />
      </div>

      {itens.length === 0 ? (
        <div className="card card-p">
          <Vazio titulo="Catálogo vazio"
            texto="Sem produto cadastrado, a aderência técnica de todo edital fica sem dado — e nota sem dado derruba a confiança, não a nota.">
            {podeEditar && <button className="b" onClick={() => setFicha('novo')}>Cadastrar o primeiro produto</button>}
          </Vazio>
        </div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Produto</th><th>Potência</th><th>Fluxo</th><th>Eficácia</th>
                  <th>Temp.</th><th>IP / IK</th><th>Garantia</th><th>Preço ref.</th><th></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((p) => {
                  const derivada = eficaciaDerivada(p)
                  return (
                    <tr key={p.id} style={{ cursor: podeEditar ? 'pointer' : 'default', opacity: p.ativo ? 1 : 0.6 }}
                      onClick={() => podeEditar && setFicha(p)}>
                      <td data-l="Produto">
                        <b style={{ fontWeight: 600 }}>{p.nome}</b>
                        <div style={{ fontSize: 11.5, color: 'var(--tx2)' }}>
                          {[p.fabricante, p.modelo, p.familia].filter(Boolean).join(' · ') || '—'}
                        </div>
                        {!p.ativo && <Badge cor="var(--tx3)">inativo</Badge>}
                      </td>
                      <td data-l="Potência">{p.potenciaW ? `${p.potenciaW} W` : <Falta />}</td>
                      <td data-l="Fluxo">{p.fluxoLm ? `${p.fluxoLm} lm` : <Falta />}</td>
                      <td data-l="Eficácia">
                        {p.eficaciaLmW ? `${p.eficaciaLmW} lm/W`
                          : derivada ? <span title="Derivada de fluxo ÷ potência — não é o valor declarado" style={{ color: 'var(--tx2)' }}>≈ {derivada.toFixed(1)} lm/W</span>
                            : <Falta />}
                      </td>
                      <td data-l="Temp.">{p.temperaturaK ? `${p.temperaturaK} K` : <Falta />}</td>
                      <td data-l="IP / IK">{[p.grauIp, p.grauIk].filter(Boolean).join(' / ') || <Falta />}</td>
                      <td data-l="Garantia">{p.garantiaMeses ? `${p.garantiaMeses} meses` : <Falta />}</td>
                      <td data-l="Preço ref.">{p.precoReferencia ? fmtMoeda(p.precoReferencia, p.moeda) : <Falta />}</td>
                      <td className="td-acao" onClick={(e) => e.stopPropagation()}>
                        {podeEditar && <button className="b-sm" onClick={() => setFicha(p)}>Editar</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ficha && (
        <FichaProduto
          produto={ficha === 'novo' ? null : ficha}
          onFechar={() => setFicha(null)}
          onPronto={async (aviso) => { setFicha(null); toast(aviso); await recarregar() }}
          onErro={(m) => toast(m, true)}
        />
      )}
    </>
  )
}

const Falta = () => <span style={{ color: 'var(--tx3)', fontSize: 12 }} title="Dado ausente">—</span>

export function FaixaSemBanco({ titulo }: { titulo: string }) {
  return (
    <>
      <div className="pg-h"><h1>{titulo}</h1></div>
      <div className="card card-p">
        <div className="faixa faixa-demo">
          <span>⚠</span>Esta tela lê e grava no banco — no modo demonstrativo não há onde gravar.
        </div>
      </div>
    </>
  )
}

/* ---------------- ficha ---------------- */

function FichaProduto({ produto, onFechar, onPronto, onErro }: {
  produto: Produto | null
  onFechar: () => void
  onPronto: (aviso: string) => void | Promise<void>
  onErro: (m: string) => void
}) {
  const { orgId } = useDados()
  const [p, setP] = useState<NovoProduto>(produto ? { ...produto } : { ...VAZIO })
  const [certs, setCerts] = useState((produto?.certificacoes ?? []).join(', '))
  const [ocupado, setOcupado] = useState(false)

  const campo = <K extends keyof NovoProduto>(k: K, v: NovoProduto[K]) =>
    setP((s) => ({ ...s, [k]: v }))
  const num = (v: string) => (v.trim() === '' ? null : Number(v))

  async function salvar() {
    if (p.nome.trim().length < 2) { onErro('Dê um nome ao produto.'); return }
    if (!orgId) { onErro('Organização não carregada.'); return }
    setOcupado(true)
    try {
      await salvarProduto(orgId, produto?.id ?? null, {
        ...p, nome: p.nome.trim(),
        certificacoes: certs.split(',').map((c) => c.trim()).filter(Boolean),
      })
      await onPronto(produto ? 'Produto atualizado.' : 'Produto cadastrado.')
    } catch (e) {
      onErro((e as { message?: string }).message ?? 'Não consegui salvar.')
      setOcupado(false)
    }
  }

  async function arquivar() {
    if (!produto) return
    setOcupado(true)
    try { await arquivarProduto(produto.id); await onPronto('Produto arquivado.') }
    catch (e) { onErro((e as { message?: string }).message ?? 'Não consegui arquivar.'); setOcupado(false) }
  }

  return (
    <Modal titulo={produto ? 'Editar produto' : 'Novo produto'} largura={600} onFechar={onFechar}>
      <Campo label="Nome">
        <input className="inp" value={p.nome} autoFocus onChange={(e) => campo('nome', e.target.value)} />
      </Campo>

      <div className="grade-2">
        <Campo label="Fabricante"><input className="inp" value={p.fabricante ?? ''} onChange={(e) => campo('fabricante', e.target.value || null)} /></Campo>
        <Campo label="Modelo"><input className="inp" value={p.modelo ?? ''} onChange={(e) => campo('modelo', e.target.value || null)} /></Campo>
      </div>
      <Campo label="Família" dica="Luminária viária, projetor, poste, driver…">
        <input className="inp" value={p.familia ?? ''} onChange={(e) => campo('familia', e.target.value || null)} />
      </Campo>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', margin: '14px 0 8px' }}>
        Ficha técnica <span style={{ fontWeight: 400, color: 'var(--tx3)' }}>— deixe em branco o que não souber; em branco é honesto, zero não é</span>
      </div>
      <div className="grade-2">
        <Campo label="Potência (W)"><input className="inp" type="number" value={p.potenciaW ?? ''} onChange={(e) => campo('potenciaW', num(e.target.value))} /></Campo>
        <Campo label="Fluxo luminoso (lm)"><input className="inp" type="number" value={p.fluxoLm ?? ''} onChange={(e) => campo('fluxoLm', num(e.target.value))} /></Campo>
      </div>
      <div className="grade-2">
        <Campo label="Eficácia declarada (lm/W)" dica="Se ficar vazio, a tela mostra a derivada de fluxo ÷ potência, marcada como derivada.">
          <input className="inp" type="number" value={p.eficaciaLmW ?? ''} onChange={(e) => campo('eficaciaLmW', num(e.target.value))} />
        </Campo>
        <Campo label="Temperatura de cor (K)"><input className="inp" type="number" value={p.temperaturaK ?? ''} onChange={(e) => campo('temperaturaK', num(e.target.value))} /></Campo>
      </div>
      <div className="grade-2">
        <Campo label="IRC"><input className="inp" type="number" value={p.irc ?? ''} onChange={(e) => campo('irc', num(e.target.value))} /></Campo>
        <Campo label="Vida útil (h)"><input className="inp" type="number" value={p.vidaUtilH ?? ''} onChange={(e) => campo('vidaUtilH', num(e.target.value))} /></Campo>
      </div>
      <div className="grade-2">
        <Campo label="Grau IP"><input className="inp" value={p.grauIp ?? ''} placeholder="IP66" onChange={(e) => campo('grauIp', e.target.value || null)} /></Campo>
        <Campo label="Grau IK"><input className="inp" value={p.grauIk ?? ''} placeholder="IK08" onChange={(e) => campo('grauIk', e.target.value || null)} /></Campo>
      </div>
      <Campo label="Certificações" dica="Separe por vírgula. Ex.: INMETRO, ENEC, CE">
        <input className="inp" value={certs} onChange={(e) => setCerts(e.target.value)} />
      </Campo>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', margin: '14px 0 8px' }}>Comercial</div>
      <div className="grade-2">
        <Campo label="Garantia (meses)"><input className="inp" type="number" value={p.garantiaMeses ?? ''} onChange={(e) => campo('garantiaMeses', num(e.target.value))} /></Campo>
        <Campo label="Capacidade mensal (un.)"><input className="inp" type="number" value={p.capacidadeMensal ?? ''} onChange={(e) => campo('capacidadeMensal', num(e.target.value))} /></Campo>
      </div>
      <div className="grade-2">
        <Campo label="Preço de referência"><input className="inp" type="number" value={p.precoReferencia ?? ''} onChange={(e) => campo('precoReferencia', num(e.target.value))} /></Campo>
        <Campo label="Moeda">
          <select className="inp" value={p.moeda} onChange={(e) => campo('moeda', e.target.value as NovoProduto['moeda'])}>
            {['BRL', 'USD', 'EUR', 'GBP'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Campo>
      </div>
      <Campo label="Observações">
        <textarea className="inp" rows={2} value={p.observacoes ?? ''} onChange={(e) => campo('observacoes', e.target.value || null)} />
      </Campo>

      <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, marginTop: 4 }}>
        <input type="checkbox" checked={p.ativo} onChange={(e) => campo('ativo', e.target.checked)} />
        Disponível para proposta
      </label>

      <Rodape>
        {produto && (
          <button className="b-ghost" disabled={ocupado} style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginRight: 'auto' }}
            onClick={() => void arquivar()}>Arquivar</button>
        )}
        <button className="b-ghost" onClick={onFechar}>Cancelar</button>
        <button className="b" disabled={ocupado} onClick={() => void salvar()}>
          {ocupado ? 'Salvando…' : 'Salvar'}
        </button>
      </Rodape>
    </Modal>
  )
}
