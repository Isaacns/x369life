import { useCallback, useEffect, useMemo, useState } from 'react'
import { MODO_DEMO } from '../app.config'
import {
  AVISO_NAO_PROVISIONADO, TITULO_NAO_PROVISIONADO, ESCOPO_NORMA, listarNormas, moduloNaoProvisionado,
  SITUACAO_NORMA, type Norma,
} from '../lib/catalogo'
import { PAISES } from '../lib/demo'
import { Abas, Badge, Carregando, Erro, NaoDisponivel, Stat, Vazio } from '../ui/kit'
import { FaixaSemBanco } from './Produtos'

/* ============================================================
   Legislação e normas.

   Cada norma carrega a situação dela: vigente, revogada, substituída ou
   "a conferir". Essa quarta existe de propósito — é o que o sistema sabe que
   NÃO validou. Numa disputa, citar norma revogada custa a habilitação; fingir
   que tudo foi conferido custaria mais.
   ============================================================ */

const TIPO: Record<Norma['tipo'], string> = {
  lei: 'Lei', decreto: 'Decreto', norma_tecnica: 'Norma técnica',
  diretiva: 'Diretiva', instrucao: 'Instrução',
}

export default function Legislacao() {
  const [normas, setNormas] = useState<Norma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [semModulo, setSemModulo] = useState(false)
  const [pais, setPais] = useState('todos')
  const [escopo, setEscopo] = useState<'todos' | Norma['escopo']>('todos')
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null); setSemModulo(false)
    try { setNormas(await listarNormas()) }
    catch (e) {
      if (moduloNaoProvisionado(e)) setSemModulo(true)
      else setErro((e as { message?: string }).message ?? 'Não consegui carregar a legislação.')
    }
    setCarregando(false)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const paisesComNorma = useMemo(() => {
    const ids = [...new Set(normas.map((n) => n.paisId).filter(Boolean))] as string[]
    return ids.map((id) => ({ id, nome: PAISES.find((p) => p.id === id)?.nome ?? id.toUpperCase() }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [normas])

  const filtradas = normas.filter((n) => {
    if (pais === 'global' ? n.paisId !== null : pais !== 'todos' && n.paisId !== pais) return false
    if (escopo !== 'todos' && n.escopo !== escopo) return false
    if (busca.trim()) {
      const q = busca.toLowerCase()
      if (!`${n.identificacao} ${n.titulo} ${n.ementa ?? ''} ${n.orgao ?? ''}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  if (MODO_DEMO) return <FaixaSemBanco titulo="Legislação" />
  if (carregando) return <Carregando />
  if (semModulo) return <NaoDisponivel titulo={TITULO_NAO_PROVISIONADO} texto={AVISO_NAO_PROVISIONADO} />
  if (erro) return <Erro texto={erro} onTentar={() => void carregar()} />

  const vigentes = normas.filter((n) => n.situacao === 'vigente').length
  const revogadas = normas.filter((n) => n.situacao === 'revogada' || n.situacao === 'substituida').length
  const aConferir = normas.filter((n) => n.situacao === 'a_conferir' || !n.conferidoEm).length

  return (
    <>
      <div className="pg-h">
        <h1>Legislação e normas</h1>
        <p>O arcabouço que rege cada disputa — a lei de licitação do país e a norma técnica que o edital cita.</p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <Stat rotulo="Normas mapeadas" valor={String(normas.length)} sub={`${paisesComNorma.length} país(es)`} />
        <Stat rotulo="Vigentes" valor={String(vigentes)} sub="confirmadas em vigor" cor="var(--teal)" />
        <Stat rotulo="Revogadas ou substituídas" valor={String(revogadas)} sub="citar em proposta custa habilitação" cor="var(--danger)" />
        <Stat rotulo="A conferir" valor={String(aConferir)} sub="ninguém validou ainda" cor="var(--amber)" />
      </div>

      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="inp" style={{ width: 'auto', minWidth: 170 }} value={pais} onChange={(e) => setPais(e.target.value)}>
            <option value="todos">Todos os países</option>
            {paisesComNorma.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            <option value="global">Supranacional (UE)</option>
          </select>
          <input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Buscar por número, título ou órgão…"
            value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Abas ativa={escopo} onTrocar={setEscopo}
            itens={[
              { id: 'todos' as const, label: 'Tudo' },
              ...(Object.keys(ESCOPO_NORMA) as Norma['escopo'][]).map((e) => ({ id: e, label: ESCOPO_NORMA[e] })),
            ]} />
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="card card-p">
          <Vazio titulo="Nada encontrado" texto="Nenhuma norma bate com este filtro." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtradas.map((n) => {
            const sit = SITUACAO_NORMA[n.situacao]
            const pais = n.paisId ? PAISES.find((p) => p.id === n.paisId) : null
            return (
              <div key={n.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 14.5, fontWeight: 700, color: n.situacao === 'revogada' ? 'var(--danger)' : undefined }}>
                    {n.identificacao}
                  </b>
                  <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{TIPO[n.tipo]}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge cor={sit.cor}>{sit.label}</Badge>
                    <Badge cor="var(--tx3)">{ESCOPO_NORMA[n.escopo]}</Badge>
                    {pais ? <Badge cor="var(--tx3)">{pais.bandeira} {pais.nome}</Badge>
                      : <Badge cor="var(--tx3)">supranacional</Badge>}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{n.titulo}</div>
                {n.ementa && (
                  <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '5px 0 0', lineHeight: 1.55 }}>{n.ementa}</p>
                )}
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 8, fontFamily: 'var(--mono)' }}>
                  {[n.orgao, n.ano ? String(n.ano) : null].filter(Boolean).join(' · ')}
                  {n.url
                    ? <> · <a href={n.url} target="_blank" rel="noreferrer">texto oficial</a></>
                    : <> · link a conferir</>}
                  {!n.conferidoEm && <> · <span style={{ color: 'var(--amber)' }}>não conferido por ninguém ainda</span></>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '14px 0 0', lineHeight: 1.55 }}>
        Nenhum link foi preenchido automaticamente. Endereço errado com cara de fonte oficial é pior
        que endereço ausente — leva a pessoa ao lugar errado com confiança. O texto oficial entra
        quando alguém abrir a norma e confirmar.
      </p>
    </>
  )
}
