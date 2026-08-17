import { useCallback, useEffect, useState } from 'react'
import { MODO_DEMO } from '../app.config'
import { useDados } from '../lib/dados'
import {
  AVISO_NAO_PROVISIONADO, listarOrganizacoes, moduloNaoProvisionado, type OrganizacaoResumo,
} from '../lib/catalogo'
import { PAISES } from '../lib/demo'
import { data as fmtData } from '../lib/formato'
import { Badge, Carregando, Erro, Stat, Vazio } from '../ui/kit'
import { FaixaSemBanco } from './Produtos'

/* ============================================================
   Organizações.

   A lista sai da RLS, não de um filtro no front: quem não é admin de
   plataforma enxerga só as organizações de que participa, porque é o que a
   policy `orgs_sel` devolve. A tela não precisa esconder nada — o banco já
   não mandou.
   ============================================================ */

export default function Organizacoes() {
  const { orgId, perfilOrg, oportunidades, usuarios } = useDados()
  const [itens, setItens] = useState<OrganizacaoResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null)
    try { setItens(await listarOrganizacoes()) }
    catch (e) { setErro(moduloNaoProvisionado(e) ? AVISO_NAO_PROVISIONADO : ((e as { message?: string }).message ?? 'Não consegui carregar as organizações.')) }
    setCarregando(false)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  if (MODO_DEMO) return <FaixaSemBanco titulo="Organizações" />
  if (carregando) return <Carregando />
  if (erro) return <Erro texto={erro} onTentar={() => void carregar()} />

  const ativas = itens.filter((o) => (o.status ?? 'ativa') === 'ativa').length

  return (
    <>
      <div className="pg-h">
        <h1>Organizações</h1>
        <p>As empresas que você enxerga neste ambiente. A lista vem da RLS — não é filtro de tela.</p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <div className="card stat"><Stat rotulo="Organizações" valor={String(itens.length)} sub="visíveis para você" /></div>
        <div className="card stat"><Stat rotulo="Ativas" valor={String(ativas)} sub="em operação" cor="var(--teal)" /></div>
        <div className="card stat"><Stat rotulo="Sua carteira" valor={String(oportunidades.length)} sub={`na organização atual · ${usuarios.length} pessoa(s)`} cor="var(--brand)" /></div>
      </div>

      {itens.length === 0 ? (
        <div className="card card-p"><Vazio titulo="Nenhuma organização" texto="Você não participa de nenhuma organização neste ambiente." /></div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {itens.map((o) => {
            const atual = o.id === orgId
            const pais = o.paisOrigem ? PAISES.find((p) => p.id === o.paisOrigem) : null
            return (
              <div key={o.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 15, fontWeight: 700 }}>{o.nome}</b>
                  {atual && <Badge cor="var(--brand)">organização atual</Badge>}
                  <Badge cor={(o.status ?? 'ativa') === 'ativa' ? 'var(--teal)' : 'var(--tx3)'}>{o.status ?? 'ativa'}</Badge>
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
                    {o.criadoEm ? `desde ${fmtData(o.criadoEm)}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginTop: 4 }}>
                  {pais ? `${pais.bandeira} ${pais.nome}` : 'país de origem não informado'}
                  {' · '}{o.membros} pessoa(s) vinculada(s)
                </div>

                {atual && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', display: 'grid', gap: 4, fontSize: 12.5 }}>
                    <Linha rotulo="Produtos declarados" valor={perfilOrg.produtos.length ? perfilOrg.produtos.join(', ') : null} />
                    <Linha rotulo="Certificações" valor={perfilOrg.certificacoes.length ? perfilOrg.certificacoes.join(', ') : null} />
                    <Linha rotulo="Países de interesse" valor={perfilOrg.paisesInteresse.length
                      ? perfilOrg.paisesInteresse.map((id) => PAISES.find((p) => p.id === id)?.nome ?? id).join(', ') : null} />
                    <Linha rotulo="Capacidade mensal" valor={perfilOrg.capacidadeMensal !== '—' ? perfilOrg.capacidadeMensal : null} />
                    <Linha rotulo="Histórico" valor={perfilOrg.historicoPropostas
                      ? `${perfilOrg.historicoVitorias} vitória(s) em ${perfilOrg.historicoPropostas} proposta(s)` : null} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.55 }}>
        O perfil da organização atual é o que o sistema compara com cada edital para calcular
        aderência. Campo em branco aqui vira <b>critério sem dado</b> lá — derruba a confiança da
        nota, não a nota. Preencha em Configurações.
      </p>
    </>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <span style={{ color: 'var(--tx3)', minWidth: 150, flex: 'none' }}>{rotulo}</span>
      <span style={{ color: valor ? 'var(--tx)' : 'var(--amber)' }}>{valor ?? 'não preenchido'}</span>
    </div>
  )
}
