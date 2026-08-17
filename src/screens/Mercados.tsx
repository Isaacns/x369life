import { useCallback, useEffect, useMemo, useState } from 'react'
import { MODO_DEMO } from '../app.config'
import { useDados } from '../lib/dados'
import {
  AVISO_NAO_PROVISIONADO, listarNormas, listarPerfisPais, moduloNaoProvisionado,
  type Norma, type PerfilPais,
} from '../lib/catalogo'
import { PAISES } from '../lib/demo'
import { moeda as fmtMoeda } from '../lib/formato'
import { Badge, Carregando, Erro, Stat, Vazio } from '../ui/kit'
import { FaixaSemBanco } from './Produtos'

/* ============================================================
   Mercados e países.

   Junta três coisas que hoje moram separadas: o que a sua carteira tem
   naquele país, o que o país exige estruturalmente (portal, registro local,
   moeda) e quantas normas já estão mapeadas.

   Nenhum número de mercado — tamanho, parque instalado, verba — entra aqui.
   Isso é pesquisa, e pesquisa sem fonte é chute com aparência de dado. O que
   você vê é o que a base tem.
   ============================================================ */

export default function Mercados() {
  const { oportunidades, perfilOrg } = useDados()
  const [perfis, setPerfis] = useState<PerfilPais[]>([])
  const [normas, setNormas] = useState<Norma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null)
    try {
      const [p, n] = await Promise.all([listarPerfisPais(), listarNormas()])
      setPerfis(p); setNormas(n)
    } catch (e) { setErro(moduloNaoProvisionado(e) ? AVISO_NAO_PROVISIONADO : ((e as { message?: string }).message ?? 'Não consegui carregar os mercados.')) }
    setCarregando(false)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const linhas = useMemo(() => {
    const ids = new Set<string>([
      ...PAISES.map((p) => p.id),
      ...perfis.map((p) => p.paisId),
      ...oportunidades.map((o) => o.paisId),
    ])
    return [...ids].map((id) => {
      const pais = PAISES.find((p) => p.id === id)
      const ops = oportunidades.filter((o) => o.paisId === id)
      return {
        id,
        nome: pais?.nome ?? id.toUpperCase(),
        bandeira: pais?.bandeira ?? '🏳',
        exigeParceiroLocal: pais?.exigeParceiroLocal ?? null,
        participacao: pais?.participacaoEstrangeira ?? null,
        perfil: perfis.find((p) => p.paisId === id) ?? null,
        normas: normas.filter((n) => n.paisId === id).length,
        oportunidades: ops.length,
        valor: ops.reduce((s, o) => s + o.valor, 0),
        moeda: ops[0]?.moeda ?? 'BRL',
        deInteresse: perfilOrg.paisesInteresse.includes(id),
      }
    }).sort((a, b) => b.oportunidades - a.oportunidades || a.nome.localeCompare(b.nome))
  }, [perfis, normas, oportunidades, perfilOrg])

  if (MODO_DEMO) return <FaixaSemBanco titulo="Mercados e países" />
  if (carregando) return <Carregando />
  if (erro) return <Erro texto={erro} onTentar={() => void carregar()} />

  const comCarteira = linhas.filter((l) => l.oportunidades > 0)
  const comPerfil = linhas.filter((l) => l.perfil).length
  const barrados = linhas.filter((l) => l.exigeParceiroLocal).length

  return (
    <>
      <div className="pg-h">
        <h1>Mercados e países</h1>
        <p>Onde a carteira está, o que cada país exige de estrutura e quanto do arcabouço legal já está mapeado.</p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <div className="card stat"><Stat rotulo="Países com carteira" valor={String(comCarteira.length)} sub="com ao menos uma oportunidade" /></div>
        <div className="card stat"><Stat rotulo="Perfil de compra mapeado" valor={`${comPerfil}/${linhas.length}`} sub="portal e modalidade conhecidos" cor="var(--brand)" /></div>
        <div className="card stat"><Stat rotulo="Exigem parceiro local" valor={String(barrados)} sub="barreira estrutural de entrada" cor={barrados ? 'var(--amber)' : 'var(--teal)'} /></div>
      </div>

      {linhas.length === 0 ? (
        <div className="card card-p"><Vazio titulo="Nenhum país" texto="A base de países não foi carregada." /></div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>País</th><th>Carteira</th><th>Valor</th><th>Portal de compras</th>
                  <th>Modalidade</th><th>Entrada</th><th>Normas</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id} style={{ cursor: 'default' }}>
                    <td data-l="País">
                      <b style={{ fontWeight: 600 }}>{l.bandeira} {l.nome}</b>
                      {l.deInteresse && <div><Badge cor="var(--brand)">país de interesse</Badge></div>}
                    </td>
                    <td data-l="Carteira">
                      {l.oportunidades > 0 ? `${l.oportunidades} oportunidade(s)`
                        : <span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span>}
                    </td>
                    <td data-l="Valor">
                      {l.valor > 0 ? fmtMoeda(l.valor, l.moeda)
                        : <span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span>}
                    </td>
                    <td data-l="Portal de compras" style={{ fontSize: 12.5 }}>
                      {l.perfil?.portalCompras ?? <span style={{ color: 'var(--tx3)' }}>não mapeado</span>}
                    </td>
                    <td data-l="Modalidade" style={{ fontSize: 12.5 }}>
                      {l.perfil?.modalidadePredominante ?? <span style={{ color: 'var(--tx3)' }}>—</span>}
                    </td>
                    <td data-l="Entrada">
                      {l.exigeParceiroLocal === null ? <span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span>
                        : l.exigeParceiroLocal ? <Badge cor="var(--amber)">parceiro local</Badge>
                          : <Badge cor="var(--teal)">livre</Badge>}
                      {l.participacao === 'vedada' && <Badge cor="var(--danger)">vedada</Badge>}
                      {l.participacao === 'restrita' && <Badge cor="var(--amber)">restrita</Badge>}
                    </td>
                    <td data-l="Normas">
                      {l.normas > 0 ? `${l.normas}` : <span style={{ color: 'var(--tx3)', fontSize: 12 }}>0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '12px 14px 14px', lineHeight: 1.55 }}>
            <b>Não mapeado</b> quer dizer que ninguém preencheu ainda — não que o país não tenha portal.
            A diferença importa: o sistema nunca apresenta ausência de dado como conclusão sobre o país.
          </p>
        </div>
      )}
    </>
  )
}
