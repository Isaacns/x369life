import { useCallback, useEffect, useMemo, useState } from 'react'
import { MODO_DEMO } from '../app.config'
import { useDados } from '../lib/dados'
import {
  AVISO_NAO_PROVISIONADO, TITULO_NAO_PROVISIONADO, eficaciaDerivada, listarProdutos, moduloNaoProvisionado, type Produto,
} from '../lib/catalogo'
import { moeda as fmtMoeda } from '../lib/formato'
import { lerMedida, type Unidade } from '../lib/medida'
import { Carregando, Erro, NaoDisponivel, Vazio } from '../ui/kit'
import { FaixaSemBanco } from './Produtos'

/* ============================================================
   Comparador.

   Compara produtos do catálogo lado a lado e, quando você escolhe um edital,
   sobrepõe a exigência dele — só a exigência que o sistema realmente extraiu
   do documento, com a página de onde saiu.

   O que ele NÃO faz: adivinhar a exigência. Se o edital não teve aquele campo
   extraído, a linha diz "não extraído" em vez de dar um veredito. Comparador
   que inventa o critério é pior que comparador nenhum — ele dá confiança onde
   não há informação.
   ============================================================ */

type Comparacao = 'atende' | 'nao_atende' | 'sem_dado' | 'sem_exigencia'

interface Criterio {
  id: string
  label: string
  unidade: string
  /** Direção do "melhor": para cima (fluxo) ou para baixo (potência, preço). */
  melhor: 'maior' | 'menor'
  valor: (p: Produto) => number | null
  /** Termos que identificam o campo na extração do edital. */
  chaves: string[]
  /** Termos que DESQUALIFICAM o campo mesmo casando com uma chave.
      "Fator de potência" casa com "potência" e é outra grandeza inteiramente:
      comparar 150 W contra 0,92 marcava ✕ em todos os produtos. */
  excecoes?: string[]
  unidadeLeitura: Unidade
  /** Como o edital costuma cobrar: mínimo, máximo ou igualdade. */
  exigencia: 'minimo' | 'maximo'
}

const CRITERIOS: Criterio[] = [
  { id: 'potencia', label: 'Potência', unidade: 'W', unidadeLeitura: 'W', melhor: 'menor', valor: (p) => p.potenciaW,
    chaves: ['potência', 'potencia', 'watt'], excecoes: ['fator de potência', 'fator de potencia'], exigencia: 'maximo' },
  { id: 'fluxo', label: 'Fluxo luminoso', unidade: 'lm', unidadeLeitura: 'lm', melhor: 'maior', valor: (p) => p.fluxoLm,
    chaves: ['fluxo', 'lúmen', 'lumen'], exigencia: 'minimo' },
  { id: 'eficacia', label: 'Eficácia', unidade: 'lm/W', unidadeLeitura: 'lm/W', melhor: 'maior', valor: (p) => p.eficaciaLmW ?? eficaciaDerivada(p),
    chaves: ['eficácia', 'eficacia', 'lm/w'], exigencia: 'minimo' },
  { id: 'temperatura', label: 'Temperatura de cor', unidade: 'K', unidadeLeitura: 'K', melhor: 'maior', valor: (p) => p.temperaturaK,
    chaves: ['temperatura de cor', 'kelvin'], exigencia: 'minimo' },
  { id: 'irc', label: 'IRC', unidade: '', unidadeLeitura: '', melhor: 'maior', valor: (p) => p.irc,
    chaves: ['irc', 'reprodução de cor'], exigencia: 'minimo' },
  { id: 'vida', label: 'Vida útil', unidade: 'h', unidadeLeitura: 'h', melhor: 'maior', valor: (p) => p.vidaUtilH,
    chaves: ['vida útil', 'vida util', 'l70', 'l80'], exigencia: 'minimo' },
  { id: 'garantia', label: 'Garantia', unidade: 'meses', unidadeLeitura: 'meses', melhor: 'maior', valor: (p) => p.garantiaMeses,
    chaves: ['garantia'], exigencia: 'minimo' },
  // A chave "prazo de entrega" saiu: é grandeza em dias, e comparar dias
  // contra unidades por mês marcava ✕ ou ✓ sem sentido.
  { id: 'capacidade', label: 'Capacidade mensal', unidade: 'un.', unidadeLeitura: 'un.', melhor: 'maior', valor: (p) => p.capacidadeMensal,
    chaves: ['capacidade mensal', 'capacidade de fornecimento'], exigencia: 'minimo' },
]

export default function Comparador() {
  const { orgId, oportunidades } = useDados()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [semModulo, setSemModulo] = useState(false)
  const [escolhidos, setEscolhidos] = useState<string[]>([])
  const [edital, setEdital] = useState('')

  const recarregar = useCallback(async () => {
    if (!orgId) { setCarregando(false); return }
    setCarregando(true); setErro(null); setSemModulo(false)
    try {
      const lista = await listarProdutos(orgId)
      setProdutos(lista)
      setEscolhidos(lista.filter((p) => p.ativo).slice(0, 3).map((p) => p.id))
    } catch (e) {
      if (moduloNaoProvisionado(e)) setSemModulo(true)
      else setErro((e as { message?: string }).message ?? 'Não consegui carregar o catálogo.')
    }
    setCarregando(false)
  }, [orgId])

  useEffect(() => { void recarregar() }, [recarregar])

  const oportunidade = oportunidades.find((o) => o.id === edital) ?? null

  /* Exigências que o sistema realmente extraiu do edital, com a evidência. */
  const exigencias = useMemo(() => {
    const mapa = new Map<string, { valor: number; texto: string; documento: string; pagina: number }>()
    if (!oportunidade) return mapa
    for (const c of CRITERIOS) {
      const achado = oportunidade.camposExtraidos.find((ce) => {
        const campo = ce.campo.toLowerCase()
        if (c.excecoes?.some((x) => campo.includes(x))) return false
        return c.chaves.some((k) => campo.includes(k))
      })
      if (!achado) continue
      const medida = lerMedida(achado.valor, c.unidadeLeitura)
      if (medida === null) continue          // ambíguo → "não extraído", não chute
      mapa.set(c.id, {
        valor: medida.valor, texto: achado.valor,
        documento: achado.evidencia.documento, pagina: achado.evidencia.pagina,
      })
    }
    return mapa
  }, [oportunidade])

  if (MODO_DEMO) return <FaixaSemBanco titulo="Comparador" />
  if (carregando) return <Carregando />
  if (semModulo) return <NaoDisponivel titulo={TITULO_NAO_PROVISIONADO} texto={AVISO_NAO_PROVISIONADO} />
  if (erro) return <Erro texto={erro} onTentar={() => void recarregar()} />

  const selecao = produtos.filter((p) => escolhidos.includes(p.id))

  function alternar(id: string) {
    setEscolhidos((s) => s.includes(id) ? s.filter((x) => x !== id)
      : s.length >= 4 ? s : [...s, id])
  }

  function comparar(c: Criterio, p: Produto): Comparacao {
    const exig = exigencias.get(c.id)
    if (!exig) return 'sem_exigencia'
    const v = c.valor(p)
    if (v === null) return 'sem_dado'
    return c.exigencia === 'minimo'
      ? (v >= exig.valor ? 'atende' : 'nao_atende')
      : (v <= exig.valor ? 'atende' : 'nao_atende')
  }

  return (
    <>
      <div className="pg-h">
        <h1>Comparador</h1>
        <p>Produtos lado a lado. Escolha um edital para sobrepor a exigência que foi extraída dele — e só ela.</p>
      </div>

      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div className="sec-h"><h2>O que comparar</h2><span className="sub">até 4 produtos</span></div>

        {produtos.length === 0 ? (
          <Vazio titulo="Catálogo vazio" texto="Cadastre produtos para poder compará-los." />
        ) : (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
            {produtos.map((p) => {
              const on = escolhidos.includes(p.id)
              return (
                <button key={p.id} className="chip" onClick={() => alternar(p.id)}
                  style={on ? { borderColor: 'var(--brand)', color: 'var(--brand)', background: 'var(--brand-soft)', fontWeight: 650 } : undefined}>
                  {p.nome}
                </button>
              )
            })}
          </div>
        )}

        <label className="fld" style={{ maxWidth: 460, marginBottom: 0 }}>
          <span>Comparar contra o edital</span>
          <select className="inp" value={edital} onChange={(e) => setEdital(e.target.value)}>
            <option value="">Nenhum — só comparar os produtos entre si</option>
            {oportunidades.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
          </select>
        </label>

        {oportunidade && (
          <p style={{ fontSize: 12, color: exigencias.size ? 'var(--tx2)' : 'var(--amber)', margin: '8px 0 0', lineHeight: 1.5 }}>
            {exigencias.size
              ? `${exigencias.size} de ${CRITERIOS.length} critérios têm exigência extraída deste edital. Os demais aparecem como "não extraído" — o sistema não supõe o que não leu.`
              : 'Nenhuma exigência numérica foi extraída deste edital ainda. Rode a análise do documento para que o comparador tenha contra o que comparar.'}
          </p>
        )}
      </div>

      {selecao.length === 0 ? (
        <div className="card card-p"><Vazio titulo="Nada selecionado" texto="Escolha ao menos um produto acima." /></div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ minWidth: 170 }}>Critério</th>
                  {oportunidade && <th style={{ minWidth: 150 }}>Exigência do edital</th>}
                  {selecao.map((p) => <th key={p.id} style={{ minWidth: 130 }}>{p.nome}</th>)}
                </tr>
              </thead>
              <tbody>
                {CRITERIOS.map((c) => {
                  const valores = selecao.map((p) => c.valor(p))
                  const presentes = valores.filter((v): v is number => v !== null)
                  const melhor = presentes.length > 1
                    ? (c.melhor === 'maior' ? Math.max(...presentes) : Math.min(...presentes))
                    : null
                  const exig = exigencias.get(c.id)
                  return (
                    <tr key={c.id} style={{ cursor: 'default' }}>
                      <td data-l="Critério">
                        <b style={{ fontWeight: 500 }}>{c.label}</b>
                        <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                          {c.exigencia === 'minimo' ? 'edital costuma exigir mínimo' : 'edital costuma exigir máximo'}
                        </div>
                      </td>

                      {oportunidade && (
                        <td data-l="Exigência">
                          {exig ? (
                            <>
                              <b style={{ fontWeight: 600 }}>{exig.valor} {c.unidade}</b>
                              <div style={{ fontSize: 10.5, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
                                {exig.documento} · p. {exig.pagina}
                              </div>
                            </>
                          ) : <span style={{ color: 'var(--tx3)', fontSize: 12 }}>não extraído</span>}
                        </td>
                      )}

                      {selecao.map((p) => {
                        const v = c.valor(p)
                        const r = oportunidade ? comparar(c, p) : 'sem_exigencia'
                        const ehMelhor = v !== null && melhor !== null && v === melhor
                        return (
                          <td key={p.id} data-l={p.nome}>
                            {v === null ? <span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span> : (
                              <span style={{
                                fontWeight: ehMelhor ? 700 : 500,
                                color: r === 'nao_atende' ? 'var(--danger)' : r === 'atende' ? 'var(--teal)' : undefined,
                              }}>
                                {c.id === 'eficacia' ? v.toFixed(1) : v} {c.unidade}
                                {r === 'atende' && ' ✓'}
                                {r === 'nao_atende' && ' ✕'}
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                <tr style={{ cursor: 'default' }}>
                  <td data-l="Critério"><b style={{ fontWeight: 500 }}>Preço de referência</b></td>
                  {oportunidade && <td data-l="Exigência"><span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span></td>}
                  {selecao.map((p) => (
                    <td key={p.id} data-l={p.nome}>
                      {p.precoReferencia ? fmtMoeda(p.precoReferencia, p.moeda)
                        : <span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span>}
                    </td>
                  ))}
                </tr>

                <tr style={{ cursor: 'default' }}>
                  <td data-l="Critério"><b style={{ fontWeight: 500 }}>Certificações</b></td>
                  {oportunidade && <td data-l="Exigência"><span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span></td>}
                  {selecao.map((p) => (
                    <td key={p.id} data-l={p.nome} style={{ fontSize: 12 }}>
                      {p.certificacoes.length ? p.certificacoes.join(', ')
                        : <span style={{ color: 'var(--tx3)' }}>—</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '12px 14px 14px', lineHeight: 1.55 }}>
            <b>—</b> é dado ausente na ficha do produto, não zero. <b>✓ / ✕</b> só aparecem quando a
            exigência foi extraída do edital com evidência. Eficácia sem valor declarado é calculada
            de fluxo ÷ potência e vale como conferência, não como número de proposta.
          </p>
        </div>
      )}
    </>
  )
}
