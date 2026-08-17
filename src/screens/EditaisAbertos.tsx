import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAcesso } from '../lib/acesso'
import { coletar, CONECTORES, ultimasRodadas, type Rodada } from '../lib/coleta'
import { useDados } from '../lib/dados'
import { corPrazo, dataHora, moeda as fmtMoeda, rotuloPrazo } from '../lib/formato'
import { diasAte } from '../lib/scoring'
import { useNavegacao } from '../ui/navegacao'
import { Badge, useToast } from '../ui/kit'

/* ============================================================
   Editais abertos, vindos dos órgãos.

   É o que o sistema passou a fazer sozinho: buscar no portal oficial o que
   está com proposta aberta agora. Cada linha carrega de onde veio e quando
   foi coletada — "veio do PNCP às 8h12" é verificável; "temos 3 editais" não.

   O que aparece aqui NÃO tem nota. Edital recém-coletado não foi avaliado
   por ninguém, e mostrar aderência calculada sobre critérios vazios seria
   inventar confiança. A nota nasce quando alguém abre e preenche.
   ============================================================ */

export default function EditaisAbertos() {
  const { orgId, oportunidades, recarregar } = useDados()
  const { abrirOportunidade } = useNavegacao()
  const { editar: podeColetar } = useAcesso('oportunidades')
  const toast = useToast()
  const [rodadas, setRodadas] = useState<Rodada[]>([])
  const [coletando, setColetando] = useState(false)

  const carregarTrilha = useCallback(async () => {
    if (!orgId) return
    try { setRodadas(await ultimasRodadas(orgId, 3)) } catch { /* trilha é acessório */ }
  }, [orgId])

  useEffect(() => { void carregarTrilha() }, [carregarTrilha])

  /* Só o que veio de portal oficial e ainda dá para disputar. */
  const abertos = useMemo(() => oportunidades
    .filter((o) => o.fonteExterna)
    .map((o) => ({ o, dias: diasAte(o.prazo) }))
    .filter(({ dias }) => dias === null || dias >= 0)
    .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity)),
  [oportunidades])

  const ultima = rodadas[0]

  async function atualizar() {
    if (!orgId) return
    setColetando(true)
    try {
      const r = await coletar(orgId)
      await recarregar()
      await carregarTrilha()
      const resumo = `${r.novos ?? 0} novo(s), ${r.atualizados ?? 0} atualizado(s) `
        + `de ${r.encontrados ?? 0} editais lidos no portal.`
      if (r.aviso) toast(`${resumo} ${r.aviso}`, true)
      else toast(resumo)
    } catch (e) {
      toast('A coleta falhou: ' + ((e as { message?: string }).message ?? 'erro desconhecido'), true)
    }
    setColetando(false)
  }

  return (
    <div className="card card-p" style={{ marginBottom: 16 }}>
      <div className="sec-h">
        <h2>Editais abertos nos órgãos</h2>
        <span className="sub">
          {CONECTORES.map((c) => c.nome).join(' · ')} — com proposta aberta agora
        </span>
        <span style={{ flex: 1 }} />
        {podeColetar && (
          <button className="b-sm" disabled={coletando} onClick={() => void atualizar()}>
            {coletando ? 'Buscando no portal…' : '↻ Buscar agora'}
          </button>
        )}
      </div>

      {abertos.length === 0 ? (
        <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.6, margin: 0 }}>
          Nenhum edital coletado ainda. <b>Buscar agora</b> consulta o Portal Nacional de
          Contratações Públicas e traz o que está com proposta aberta em iluminação pública.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 9 }}>
          {abertos.map(({ o, dias }) => (
            <button key={o.id} onClick={() => abrirOportunidade(o.id)}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left',
                border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px',
                background: 'var(--card2)', font: 'inherit', color: 'inherit', cursor: 'pointer',
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{o.titulo}</div>
                <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginTop: 3 }}>{o.comprador}</div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 7, alignItems: 'center' }}>
                  <Badge cor="var(--brand)">{o.fonteExterna?.toUpperCase()}</Badge>
                  {o.tipo && <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>{o.tipo}</span>}
                  {/* Valor sob sigilo do órgão vem nulo — e nulo não é zero. */}
                  <b style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                    {o.valor ? fmtMoeda(o.valor, o.moeda, true)
                      : <span style={{ color: 'var(--tx3)', fontWeight: 400 }}>valor não divulgado</span>}
                  </b>
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ color: corPrazo(dias), fontWeight: 700, fontSize: 13 }}>
                  {rotuloPrazo(dias)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
                  sem avaliação
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* A trilha da coleta. Sem ela, carteira desatualizada tem a mesma cara
          de carteira atual — e é isso que faz alguém perder um prazo. */}
      <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '12px 0 0', lineHeight: 1.55 }}>
        {ultima ? (
          <>
            Última busca: <b style={{ color: 'var(--tx2)' }}>{dataHora(ultima.iniciadoEm)}</b>
            {' · '}{ultima.encontrados} editais lidos, {ultima.aderentes} do setor
            {ultima.situacao === 'falhou' && (
              <> · <span style={{ color: 'var(--danger)' }}>falhou: {ultima.erro}</span></>
            )}
            {ultima.situacao === 'concluida' && ultima.erro && (
              <> · <span style={{ color: 'var(--amber)' }}>parcial — {ultima.erro}</span></>
            )}
          </>
        ) : 'Nenhuma busca registrada ainda.'}
      </p>
    </div>
  )
}
