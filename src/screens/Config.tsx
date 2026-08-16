import { useState } from 'react'
import { APP, IA, MODO_DEMO, PERFIS, podeAdministrar, type Perfil } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { useDados } from '../lib/dados'
import { estadoIA } from '../lib/ia'
import { PESOS_ADERENCIA_PADRAO, ROTULOS_ADERENCIA } from '../lib/scoring'
import { Badge, Barra, FaixaDemo, useToast } from '../ui/kit'
import { useTema } from '../ui/tema'

export default function Config() {
  const { pesos, setPesos, perfilOrg } = useDados()
  const { usuario } = useAuth()
  const { tema, alternar } = useTema()
  const toast = useToast()
  const ia = estadoIA()
  const admin = podeAdministrar((usuario?.perfil ?? null) as Perfil | null)

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
            onClick={() => { setPesos(rascunho); toast('Pesos aplicados. As notas foram recalculadas.') }}>
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
          <Info rotulo="Tipo" valor={perfilOrg.tipo} />
          <Info rotulo="Produtos" valor={perfilOrg.produtos.join(', ')} />
          <Info rotulo="Certificações" valor={perfilOrg.certificacoes.join(', ')} />
          <Info rotulo="Capacidade" valor={perfilOrg.capacidadeMensal} />
          <Info rotulo="Histórico" valor={`${perfilOrg.historicoVitorias} vitórias em ${perfilOrg.historicoPropostas} propostas`} />
        </div>
      </div>

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
