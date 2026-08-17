import { useState } from 'react'
import { APP, IA, MODO_DEMO, PERFIS, podeAdministrar, type Perfil } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { useDados } from '../lib/dados'
import { estadoIA } from '../lib/ia'
import { PESOS_ADERENCIA_PADRAO, ROTULOS_ADERENCIA } from '../lib/scoring'
import { PAISES } from '../lib/demo'
import type { PerfilOrganizacao } from '../lib/tipos'
import { Badge, Barra, Campo, FaixaDemo, Modal, Rodape, useToast } from '../ui/kit'
import { useTema } from '../ui/tema'

export default function Config() {
  const { pesos, setPesos, perfilOrg, salvarPerfilOrg } = useDados()
  const { usuario } = useAuth()
  const { tema, alternar } = useTema()
  const toast = useToast()
  const ia = estadoIA()
  const admin = podeAdministrar((usuario?.perfil ?? null) as Perfil | null)

  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [rascunho, setRascunho] = useState<Record<string, number>>(pesos)
  const soma = Object.values(rascunho).reduce((s, v) => s + v, 0)
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(pesos)

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h">
        <h1>Configurações</h1>
        <p>O que muda o comportamento do sistema — pesos da aderência, aparência e integrações.</p>
      </div>

      {/* ---------- pesos da aderência ---------- */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div className="sec-h">
          <h2>Critérios de aderência</h2>
          <span className="sub">a fórmula é configurável — a soma precisa fechar em 100</span>
        </div>

        {!admin && (
          <div className="faixa faixa-legal">
            <span>⛔</span>Somente administradores alteram a fórmula de pontuação.
          </div>
        )}

        {Object.keys(PESOS_ADERENCIA_PADRAO).map((id) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ flex: '1 1 190px', fontSize: 13.5, minWidth: 150 }}>{ROTULOS_ADERENCIA[id]}</span>
            <input type="range" min={0} max={40} step={1} disabled={!admin}
              value={rascunho[id] ?? 0} style={{ flex: '1 1 140px', maxWidth: 220 }}
              onChange={(e) => setRascunho((s) => ({ ...s, [id]: Number(e.target.value) }))}
              aria-label={`Peso de ${ROTULOS_ADERENCIA[id]}`} />
            <b style={{ width: 42, textAlign: 'right', fontWeight: 700 }}>{rascunho[id] ?? 0}%</b>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
              <span>Soma dos pesos</span>
              <b style={{ color: soma === 100 ? 'var(--teal)' : 'var(--danger)' }}>{soma}%</b>
            </div>
            <Barra valor={Math.min(soma, 100)} cor={soma === 100 ? 'var(--teal)' : 'var(--danger)'} altura={6} />
          </div>
          <button className="b-ghost" disabled={!admin} onClick={() => setRascunho(PESOS_ADERENCIA_PADRAO)}>
            Restaurar padrão
          </button>
          <button className="b" disabled={!admin || soma !== 100 || !alterado}
            onClick={() => {
              void setPesos(rascunho)
                .then(() => toast('Nova versão de pesos aplicada. As notas foram recalculadas.'))
                .catch((e: unknown) => toast('Não consegui salvar os pesos: '
                  + ((e as { message?: string }).message ?? 'falha desconhecida')
                  + '. Os pesos anteriores continuam valendo.', true))
            }}>
            Aplicar
          </button>
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '12px 0 0', lineHeight: 1.55 }}>
          Alterar os pesos recalcula as notas de todas as oportunidades. Quando o backend for provisionado,
          cada avaliação passa a gravar a versão de pesos que usou — assim recalcular não reescreve o histórico.
        </p>
      </div>

      {/* ---------- IA ---------- */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div className="sec-h">
          <h2>Inteligência artificial</h2>
          {ia.ativa ? <Badge cor="var(--teal)">ativa</Badge> : <Badge cor="var(--amber)">dormente</Badge>}
        </div>
        <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 12px', lineHeight: 1.55 }}>{ia.texto}</p>
        <div style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.9 }}>
          <div>Provedor previsto: <b style={{ color: 'var(--tx)' }}>Anthropic (Claude)</b></div>
          <div>Modelo: <b style={{ color: 'var(--tx)' }}>{IA.modelo}</b></div>
          <div>Caminho da chamada: Edge Function <b style={{ color: 'var(--tx)' }}>{IA.endpoint}</b> — a chave nunca vive no navegador</div>
        </div>
        <div className="faixa faixa-legal" style={{ marginTop: 14, marginBottom: 0 }}>
          <span>◈</span>Para ligar: provisionar o projeto Supabase, publicar a Edge Function, gravar <code>ANTHROPIC_API_KEY</code> no ambiente e definir <code>VITE_IA_ATIVA=true</code> no build. Enquanto isso, nenhuma análise é simulada.
        </div>
      </div>

      {/* ---------- organização ---------- */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div className="sec-h">
          <h2>Perfil da organização</h2>
          <span className="sub">é o que alimenta o cálculo de aderência</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, fontSize: 13 }}>
          <Info rotulo="Organização" valor={perfilOrg.nome} />
          <Info rotulo="Produtos" valor={perfilOrg.produtos.join(', ')} />
          <Info rotulo="Certificações" valor={perfilOrg.certificacoes.join(', ')} />
          <Info rotulo="Países de interesse" valor={perfilOrg.paisesInteresse
            .map((id) => PAISES.find((x) => x.id === id)?.nome ?? id).join(', ')} />
          <Info rotulo="Capacidade mensal" valor={perfilOrg.capacidadeMensal} />
          <Info rotulo="Histórico" valor={perfilOrg.historicoPropostas
            ? `${perfilOrg.historicoVitorias} vitórias em ${perfilOrg.historicoPropostas} propostas`
            : ''} />
        </div>

        {admin && (
          <button className="b" style={{ marginTop: 14 }} onClick={() => setEditandoPerfil(true)}>
            Editar perfil da organização
          </button>
        )}
        <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '12px 0 0', lineHeight: 1.55 }}>
          Campo em branco aqui vira <b>critério sem dado</b> na aderência de todo edital — derruba a
          confiança da nota, não a nota. É por isso que o sistema mostra a lacuna em vez de assumir zero.
        </p>
      </div>

      {editandoPerfil && (
        <FichaPerfilOrg
          perfil={perfilOrg}
          onFechar={() => setEditandoPerfil(false)}
          onSalvar={async (p) => {
            try {
              await salvarPerfilOrg(p)
              setEditandoPerfil(false)
              toast('Perfil da organização atualizado. As notas foram recalculadas.')
            } catch (e) {
              toast('Não consegui salvar: ' + ((e as { message?: string }).message ?? 'falha'), true)
            }
          }} />
      )}

      {/* ---------- aparência e versão ---------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        <div className="card card-p">
          <div className="sec-h"><h2>Aparência</h2></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5 }}>
            <span>Tema {tema}</span>
            <button className="b-sm" onClick={alternar}>Alternar para {tema === 'claro' ? 'escuro' : 'claro'}</button>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '10px 0 0' }}>
            A escolha fica salva neste aparelho.
          </p>
        </div>

        <div className="card card-p">
          <div className="sec-h"><h2>Sobre</h2></div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.9 }}>
            <div>Sistema: <b style={{ color: 'var(--tx)' }}>{APP.nome}</b></div>
            <div>Versão: <b style={{ color: 'var(--tx)' }}>{APP.versao}</b></div>
            <div>Você: <b style={{ color: 'var(--tx)' }}>{usuario?.nome}</b> · {PERFIS[(usuario?.perfil ?? 'visualizador') as Perfil].label}</div>
            <div>Modo: <b style={{ color: MODO_DEMO ? 'var(--amber)' : 'var(--teal)' }}>{MODO_DEMO ? 'demonstrativo' : 'produção'}</b></div>
          </div>
        </div>
      </div>
    </>
  )
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', fontWeight: 600, marginBottom: 2 }}>{rotulo}</div>
      <div style={{ lineHeight: 1.45 }}>{valor}</div>
    </div>
  )
}

/* ============================================================
   Ficha do perfil da organização.
   É o retrato da empresa contra o qual cada edital é comparado. Lista vazia
   aqui não é zero na nota — é critério sem dado, e a nota vem com menos
   confiança. Por isso os campos nascem vazios em vez de com valor plausível.
   ============================================================ */
function FichaPerfilOrg({ perfil, onFechar, onSalvar }: {
  perfil: PerfilOrganizacao
  onFechar: () => void
  onSalvar: (p: PerfilOrganizacao) => void | Promise<void>
}) {
  const [produtos, setProdutos] = useState(perfil.produtos.join(', '))
  const [certificacoes, setCertificacoes] = useState(perfil.certificacoes.join(', '))
  const [paises, setPaises] = useState<string[]>(perfil.paisesInteresse)
  const [paisOrigem, setPaisOrigem] = useState(perfil.paisOrigem)
  const [capacidade, setCapacidade] = useState(perfil.capacidadeMensal === '—' ? '' : perfil.capacidadeMensal)
  const [faixaMin, setFaixaMin] = useState(perfil.faixaMin || 0)
  const [faixaMax, setFaixaMax] = useState(perfil.faixaMax || 0)
  const [propostas, setPropostas] = useState(perfil.historicoPropostas)
  const [vitorias, setVitorias] = useState(perfil.historicoVitorias)
  const [ocupado, setOcupado] = useState(false)

  const lista = (t: string) => t.split(',').map((x) => x.trim()).filter(Boolean)
  const faixaOk = faixaMax === 0 || faixaMax >= faixaMin
  const historicoOk = vitorias <= propostas
  const valido = faixaOk && historicoOk

  return (
    <Modal titulo="Perfil da organização" largura={600} onFechar={onFechar}>
      <Campo label="Produtos que a empresa oferece"
        dica="Separe por vírgula. É o que o sistema compara com o objeto de cada edital.">
        <input className="inp" value={produtos} autoFocus onChange={(e) => setProdutos(e.target.value)}
          placeholder="Luminária LED viária, Telegestão, Poste" />
      </Campo>

      <Campo label="Certificações" dica="Separe por vírgula. Ex.: INMETRO, ISO 9001, CE">
        <input className="inp" value={certificacoes} onChange={(e) => setCertificacoes(e.target.value)} />
      </Campo>

      <Campo label="País de origem">
        <select className="inp" value={paisOrigem} onChange={(e) => setPaisOrigem(e.target.value)}>
          {PAISES.map((p) => <option key={p.id} value={p.id}>{p.bandeira} {p.nome}</option>)}
        </select>
      </Campo>

      <div className="fld">
        <span>Países de interesse</span>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 4 }}>
          {PAISES.map((p) => {
            const on = paises.includes(p.id)
            return (
              <button key={p.id} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on}
                onClick={() => setPaises((s) => on ? s.filter((x) => x !== p.id) : [...s, p.id])}>
                {p.bandeira} {p.nome}
              </button>
            )
          })}
        </div>
      </div>

      <Campo label="Capacidade mensal" dica="Como a equipe fala dela. Ex.: 12.000 luminárias/mês">
        <input className="inp" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} />
      </Campo>

      <div className="grade-2">
        <Campo label="Contrato mínimo que interessa">
          <input className="inp" type="number" value={faixaMin || ''}
            onChange={(e) => setFaixaMin(Number(e.target.value) || 0)} />
        </Campo>
        <Campo label="Contrato máximo que a empresa entrega"
          dica={faixaOk ? undefined : 'O máximo precisa ser maior que o mínimo.'}>
          <input className="inp" type="number" value={faixaMax || ''}
            onChange={(e) => setFaixaMax(Number(e.target.value) || 0)} />
        </Campo>
      </div>

      <div className="grade-2">
        <Campo label="Propostas já enviadas" dica="A partir de 3, o histórico entra no cálculo de probabilidade.">
          <input className="inp" type="number" min={0} value={propostas}
            onChange={(e) => setPropostas(Math.max(0, Number(e.target.value) || 0))} />
        </Campo>
        <Campo label="Vitórias" dica={historicoOk ? undefined : 'Não pode haver mais vitórias que propostas.'}>
          <input className="inp" type="number" min={0} value={vitorias}
            onChange={(e) => setVitorias(Math.max(0, Number(e.target.value) || 0))} />
        </Campo>
      </div>

      <Rodape>
        <button className="b-ghost" onClick={onFechar}>Cancelar</button>
        <button className="b" disabled={!valido || ocupado} onClick={() => {
          setOcupado(true)
          void Promise.resolve(onSalvar({
            ...perfil,
            paisOrigem,
            paisesInteresse: paises,
            produtos: lista(produtos),
            certificacoes: lista(certificacoes),
            capacidadeMensal: capacidade.trim() || '—',
            faixaMin, faixaMax,
            historicoPropostas: propostas, historicoVitorias: vitorias,
          })).finally(() => setOcupado(false))
        }}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
      </Rodape>
    </Modal>
  )
}
