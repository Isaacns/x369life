import { useCallback, useEffect, useMemo, useState } from 'react'
import { MODO_DEMO, type Perfil } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { useDados } from '../lib/dados'
import { AVISO_NAO_PROVISIONADO, moduloNaoProvisionado } from '../lib/catalogo'
import { podeEditarModulo } from '../lib/permissoes'
import {
  arquivar, atualizar, criar, diaMes, horaPadrao, iso, listarSemana, NOMES_DIA,
  periodoAgora, PERIODOS, segundaDe, somaDias, STATUS, trilha,
  type Compromisso, type LinhaTrilha, type Periodo, type StatusAgenda,
} from '../lib/agenda'
import { dataHora } from '../lib/formato'
import { Campo, Carregando, Erro, Modal, Rodape, useToast } from '../ui/kit'

/* ============================================================
   Agenda da semana — padrão da Pauta Semanal do Inovar:
   semana navegável, dia dividido em Manhã / Tarde / Noite, arrastar para
   reagendar, e trilha de alterações.

   O que muda aqui: o prazo de cada edital aparece na semana sozinho, sem
   ninguém digitar. É o que faz a agenda valer no primeiro dia — ela nasce
   com o compromisso que o produto já conhece.
   ============================================================ */

const CHAVE_PER = 'x369_agenda_periodos'

export default function Agenda() {
  const { orgId, oportunidades, usuarios } = useDados()
  const { usuario } = useAuth()
  const toast = useToast()

  const [semana, setSemana] = useState(0)
  const [quem, setQuem] = useState<string>('todos')
  const [itens, setItens] = useState<Compromisso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<Compromisso | null>(null)
  const [novoEm, setNovoEm] = useState<{ data: string; periodo: Periodo } | null>(null)
  const [historico, setHistorico] = useState<LinhaTrilha[] | null>(null)
  const [fechados, setFechados] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_PER) ?? '{}') } catch { return {} }
  })

  const podeEditar = podeEditarModulo(
    (usuario?.perfil ?? 'visualizador') as Perfil, usuario?.permissoes, 'agenda')

  const base = useMemo(() => somaDias(segundaDe(new Date()), semana * 7), [semana])
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => somaDias(base, i)), [base])
  const hojeIso = iso(new Date())
  const agora = periodoAgora()

  const recarregar = useCallback(async () => {
    if (!orgId) { setCarregando(false); return }
    setCarregando(true); setErro(null)
    try {
      setItens(await listarSemana(orgId, iso(dias[0]), iso(dias[6])))
    } catch (e) {
      setErro(moduloNaoProvisionado(e) ? AVISO_NAO_PROVISIONADO
        : ((e as { message?: string }).message ?? 'Não consegui carregar a agenda.'))
    }
    setCarregando(false)
  }, [orgId, dias])

  useEffect(() => { void recarregar() }, [recarregar])

  /* Prazos de edital da semana, como marcadores de leitura. */
  const prazos = useMemo(() => {
    const de = iso(dias[0]), ate = iso(dias[6])
    return oportunidades
      .filter((o) => o.prazo && o.prazo >= de && o.prazo <= ate)
      .map((o) => ({ id: o.id, data: o.prazo as string, titulo: o.titulo }))
  }, [oportunidades, dias])

  const visiveis = quem === 'todos' ? itens : itens.filter((c) => c.responsavelId === quem)

  function togglePeriodo(p: Periodo) {
    setFechados((s) => {
      const n = { ...s, [p]: !s[p] }
      try { localStorage.setItem(CHAVE_PER, JSON.stringify(n)) } catch { /* modo privado */ }
      return n
    })
  }

  async function soltar(id: string, data: string, periodo: Periodo) {
    const c = itens.find((x) => x.id === id)
    if (!c || (c.data === data && c.periodo === periodo)) return
    const hora = c.periodo === periodo ? c.hora : horaPadrao(periodo)
    setItens((s) => s.map((x) => (x.id === id ? { ...x, data, periodo, hora } : x)))  // otimista
    try {
      await atualizar(id, { data, periodo, hora })
      toast('Compromisso reagendado.')
    } catch (e) {
      setItens((s) => s.map((x) => (x.id === id ? c : x)))                            // desfaz
      toast((e as { message?: string }).message ?? 'Não consegui reagendar.', true)
    }
  }

  async function verHistorico() {
    if (!orgId) return
    try { setHistorico(await trilha(orgId)) }
    catch (e) { toast((e as { message?: string }).message ?? 'Não consegui abrir a trilha.', true) }
  }

  if (MODO_DEMO) {
    return (
      <>
        <div className="pg-h"><h1>Agenda</h1><p>Compromissos da semana e prazos dos editais.</p></div>
        <div className="card card-p">
          <div className="faixa faixa-demo"><span>⚠</span>A agenda grava no banco — no modo demonstrativo não há onde gravar.</div>
        </div>
      </>
    )
  }
  if (carregando) return <Carregando />
  if (erro) return <Erro texto={erro} onTentar={() => void recarregar()} />

  const primeiroNome = (usuario?.nome ?? '').trim().split(/\s+/)[0]
  const fimDeSemana = dias.slice(5)
  const temFimDeSemana = fimDeSemana.some((d) =>
    visiveis.some((c) => c.data === iso(d)) || prazos.some((p) => p.data === iso(d)))

  return (
    <>
      <div className="pg-h" style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1>{primeiroNome ? `Olá, ${primeiroNome}. ` : ''}Esta é a agenda da semana</h1>
          <p>
            {visiveis.length} compromisso(s) · semana de <b>{diaMes(dias[0])}</b> a <b>{diaMes(dias[6])}</b>
            {prazos.length > 0 && <> · <b style={{ color: 'var(--danger)' }}>{prazos.length} prazo(s) de edital</b></>}
          </p>
        </div>
        <div className="nao-imprime" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="inp" style={{ width: 'auto', height: 32, padding: '0 10px', fontSize: 13 }}
            value={quem} onChange={(e) => setQuem(e.target.value)} aria-label="Responsável">
            <option value="todos">Toda a equipe</option>
            {usuarios.filter((u) => u.ativo).map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
          <button className="b-sm" onClick={() => setSemana((s) => s - 1)} title="Semana anterior">‹</button>
          <button className="b-sm" onClick={() => setSemana(0)}>Hoje</button>
          <button className="b-sm" onClick={() => setSemana((s) => s + 1)} title="Próxima semana">›</button>
          <button className="b-sm" onClick={() => void verHistorico()}>🕓 Histórico</button>
          {podeEditar && (
            <button className="b" onClick={() => setNovoEm({ data: hojeIso, periodo: agora })}>
              + Novo compromisso
            </button>
          )}
        </div>
      </div>

      <div className="faixa faixa-legal" style={{ marginBottom: 14 }}>
        <span>⏰</span>
        Agora é <b>&nbsp;{PERIODOS.find((p) => p.id === agora)?.nome}</b>. Manhã, tarde e noite ficam
        separadas — clique no título de um período para abrir ou fechar. Arraste um compromisso para
        outro dia ou período para reagendar.
      </div>

      <div className="ag-semana">
        {dias.slice(0, 5).map((d, i) => (
          <Dia key={iso(d)} data={d} nome={NOMES_DIA[i]} hoje={iso(d) === hojeIso}
            itens={visiveis.filter((c) => c.data === iso(d))}
            prazos={prazos.filter((p) => p.data === iso(d))}
            agora={agora} fechados={fechados} podeEditar={podeEditar}
            onTogglePeriodo={togglePeriodo}
            onAbrir={setEditando}
            onNovo={(periodo) => setNovoEm({ data: iso(d), periodo })}
            onSoltar={soltar} />
        ))}
      </div>

      {temFimDeSemana && (
        <>
          <div className="sec-h" style={{ marginTop: 18 }}>
            <h2>Fim de semana</h2>
            <span className="sub">aparece só quando há algo marcado</span>
          </div>
          <div className="ag-semana" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
            {fimDeSemana.map((d, i) => (
              <Dia key={iso(d)} data={d} nome={NOMES_DIA[5 + i]} hoje={iso(d) === hojeIso}
                itens={visiveis.filter((c) => c.data === iso(d))}
                prazos={prazos.filter((p) => p.data === iso(d))}
                agora={agora} fechados={fechados} podeEditar={podeEditar}
                onTogglePeriodo={togglePeriodo}
                onAbrir={setEditando}
                onNovo={(periodo) => setNovoEm({ data: iso(d), periodo })}
                onSoltar={soltar} />
            ))}
          </div>
        </>
      )}

      {(editando || novoEm) && (
        <Ficha
          compromisso={editando}
          inicial={novoEm}
          onFechar={() => { setEditando(null); setNovoEm(null) }}
          onPronto={async (aviso) => { setEditando(null); setNovoEm(null); toast(aviso); await recarregar() }}
          onErro={(m) => toast(m, true)}
        />
      )}

      {historico && <Historico linhas={historico} onFechar={() => setHistorico(null)} />}
    </>
  )
}

/* ---------------- um dia ---------------- */

function Dia({ data, nome, hoje, itens, prazos, agora, fechados, podeEditar, onTogglePeriodo, onAbrir, onNovo, onSoltar }: {
  data: Date; nome: string; hoje: boolean
  itens: Compromisso[]
  prazos: { id: string; data: string; titulo: string }[]
  agora: Periodo
  fechados: Record<string, boolean>
  podeEditar: boolean
  onTogglePeriodo: (p: Periodo) => void
  onAbrir: (c: Compromisso) => void
  onNovo: (p: Periodo) => void
  onSoltar: (id: string, data: string, p: Periodo) => void
}) {
  return (
    <div className={'ag-dia' + (hoje ? ' hoje' : '')}>
      <div className="ag-dia-h">
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <b>{nome}</b><span className="dt">{diaMes(data)}</span>
        </span>
        {podeEditar && (
          <button className="ag-mais" title="Adicionar compromisso" onClick={() => onNovo(agora)}>＋</button>
        )}
      </div>

      {/* Prazos ficam fora dos períodos: são do dia inteiro, não da manhã. */}
      {prazos.map((p) => (
        <div key={p.id} className="ag-evt prazo">
          <div className="h">prazo do edital</div>
          <div className="t">{p.titulo}</div>
        </div>
      ))}

      {PERIODOS.map((P) => {
        const doPeriodo = itens.filter((c) => c.periodo === P.id)
        const fechado = !!fechados[P.id] && doPeriodo.length > 0
        return (
          <div key={P.id}
            className={'ag-per' + (fechado ? ' fechado' : '') + (P.id === agora ? ' agora' : '')}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('solta') }}
            onDragLeave={(e) => e.currentTarget.classList.remove('solta')}
            onDrop={(e) => {
              e.preventDefault(); e.currentTarget.classList.remove('solta')
              const id = e.dataTransfer.getData('text/plain')
              if (id) onSoltar(id, iso(data), P.id)
            }}>
            <div className="ag-per-h" onClick={() => onTogglePeriodo(P.id)}>
              <span aria-hidden>{P.ico}</span><b>{P.nome}</b>
              <span className="n">{doPeriodo.length}</span>
              <span style={{ color: 'var(--tx3)' }}>{fechado ? '▸' : '▾'}</span>
            </div>
            <div className="ag-per-corpo">
              {doPeriodo.length === 0 ? <div className="ag-vazio">—</div> : doPeriodo.map((c) => (
                <div key={c.id} className="ag-evt" draggable={podeEditar}
                  style={{ borderLeftColor: STATUS[c.status].cor }}
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.currentTarget.classList.add('arrastando') }}
                  onDragEnd={(e) => e.currentTarget.classList.remove('arrastando')}
                  onClick={() => onAbrir(c)}>
                  <div className="h">{c.hora ?? '—'}</div>
                  <div className="t">{c.titulo}</div>
                  {c.oportunidadeTitulo && <div className="op">◎ {c.oportunidadeTitulo}</div>}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                    <span className="badge" style={{ borderColor: STATUS[c.status].cor, color: STATUS[c.status].cor }}>
                      {STATUS[c.status].label}
                    </span>
                    {c.responsavelNome && (
                      <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{c.responsavelNome.split(' ')[0]}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- ficha do compromisso ---------------- */

function Ficha({ compromisso, inicial, onFechar, onPronto, onErro }: {
  compromisso: Compromisso | null
  inicial: { data: string; periodo: Periodo } | null
  onFechar: () => void
  onPronto: (aviso: string) => void | Promise<void>
  onErro: (m: string) => void
}) {
  const { orgId, oportunidades, usuarios } = useDados()
  const { usuario } = useAuth()

  const [data, setData] = useState(compromisso?.data ?? inicial?.data ?? iso(new Date()))
  const [periodo, setPeriodo] = useState<Periodo>(compromisso?.periodo ?? inicial?.periodo ?? 'manha')
  const [hora, setHora] = useState(compromisso?.hora ?? horaPadrao(compromisso?.periodo ?? inicial?.periodo ?? 'manha'))
  const [titulo, setTitulo] = useState(compromisso?.titulo ?? '')
  const [detalhe, setDetalhe] = useState(compromisso?.detalhe ?? '')
  const [status, setStatus] = useState<StatusAgenda>(compromisso?.status ?? 'pendente')
  const [resp, setResp] = useState(compromisso?.responsavelId ?? usuario?.id ?? '')
  const [op, setOp] = useState(compromisso?.oportunidadeId ?? '')
  const [ocupado, setOcupado] = useState(false)

  const valido = titulo.trim().length >= 3 && !!data

  async function salvar() {
    if (!orgId || !usuario) { onErro('Organização não carregada.'); return }
    setOcupado(true)
    const campos = {
      data, periodo, hora: hora.trim() || null, titulo: titulo.trim(),
      detalhe: detalhe.trim() || null, status,
      responsavelId: resp || null, oportunidadeId: op || null,
    }
    try {
      if (compromisso) { await atualizar(compromisso.id, campos); await onPronto('Compromisso atualizado.') }
      else { await criar(orgId, usuario.id, campos); await onPronto('Compromisso criado.') }
    } catch (e) {
      onErro((e as { message?: string }).message ?? 'Não consegui salvar.')
      setOcupado(false)
    }
  }

  async function remover() {
    if (!compromisso) return
    setOcupado(true)
    try { await arquivar(compromisso.id); await onPronto('Compromisso arquivado.') }
    catch (e) { onErro((e as { message?: string }).message ?? 'Não consegui arquivar.'); setOcupado(false) }
  }

  return (
    <Modal titulo={compromisso ? 'Editar compromisso' : 'Novo compromisso'} largura={520} onFechar={onFechar}>
      <Campo label="O que é">
        <input className="inp" value={titulo} autoFocus onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: visita técnica ao órgão, entrega da proposta" />
      </Campo>

      <div className="grade-2">
        <Campo label="Data">
          <input className="inp" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Campo>
        <Campo label="Período">
          <select className="inp" value={periodo}
            onChange={(e) => { const p = e.target.value as Periodo; setPeriodo(p); setHora(horaPadrao(p)) }}>
            {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Campo>
      </div>

      <div className="grade-2">
        <Campo label="Horário" dica="Texto livre — o que fizer sentido para a equipe.">
          <input className="inp" value={hora} onChange={(e) => setHora(e.target.value)} placeholder="09h - 10h" />
        </Campo>
        <Campo label="Situação">
          <select className="inp" value={status} onChange={(e) => setStatus(e.target.value as StatusAgenda)}>
            {(Object.keys(STATUS) as StatusAgenda[]).map((s) => (
              <option key={s} value={s}>{STATUS[s].label}</option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="grade-2">
        <Campo label="Responsável">
          <select className="inp" value={resp} onChange={(e) => setResp(e.target.value)}>
            <option value="">Sem responsável</option>
            {usuarios.filter((u) => u.ativo).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </Campo>
        <Campo label="Oportunidade" dica="Liga o compromisso ao edital a que ele pertence.">
          <select className="inp" value={op} onChange={(e) => setOp(e.target.value)}>
            <option value="">Nenhuma</option>
            {oportunidades.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
          </select>
        </Campo>
      </div>

      <Campo label="Detalhe (opcional)">
        <textarea className="inp" rows={3} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} />
      </Campo>

      <Rodape>
        {compromisso && (
          <button className="b-ghost" disabled={ocupado} style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginRight: 'auto' }}
            onClick={() => void remover()}>Arquivar</button>
        )}
        <button className="b-ghost" onClick={onFechar}>Cancelar</button>
        <button className="b" disabled={!valido || ocupado} onClick={() => void salvar()}>
          {ocupado ? 'Salvando…' : 'Salvar'}
        </button>
      </Rodape>
    </Modal>
  )
}

/* ---------------- trilha ---------------- */

const ROTULO: Record<string, string> = { INSERT: 'criou', UPDATE: 'alterou', DELETE: 'removeu' }

function Historico({ linhas, onFechar }: { linhas: LinhaTrilha[]; onFechar: () => void }) {
  return (
    <Modal titulo="Histórico de alterações da agenda" largura={560} onFechar={onFechar}>
      <p style={{ fontSize: 12.5, color: 'var(--tx2)', margin: '-4px 0 12px' }}>
        Toda criação, alteração e arquivamento fica registrado. A trilha é imutável — nem
        administrador apaga linha de auditoria.
      </p>
      {linhas.length === 0 ? (
        <p style={{ color: 'var(--tx3)', fontSize: 13 }}>Nenhuma alteração registrada ainda.</p>
      ) : (
        <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
          {linhas.map((l) => (
            <div key={l.id} style={{ borderBottom: '1px solid var(--line)', padding: '9px 2px', fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <b>{ROTULO[l.operacao] ?? l.operacao}</b>
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
                  {dataHora(l.criadoEm)}
                </span>
              </div>
              <div style={{ marginTop: 2 }}>{l.titulo ?? '—'}</div>
              {l.antes && <div style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 1 }}>antes: {l.antes}</div>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
