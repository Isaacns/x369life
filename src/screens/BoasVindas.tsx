import { useEffect, useState } from 'react'
import { APP } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { useDados } from '../lib/dados'
import { Emblema } from '../ui/Marca'

/* ============================================================
   Boas-vindas e apresentação do sistema no primeiro acesso.
   Padrão Ateliê Manager: cartão em vidro sobre o fundo vivo,
   emblema respirando dentro do anel da identidade.

   O tutorial é uma sequência curta e navegável — não um tour com
   balõezinhos por cima da tela. A razão: o que precisa ser
   entendido aqui não é onde fica o botão, é como o sistema pensa.
   Quem já sabe pula em um clique.
   ============================================================ */

const CHAVE = 'x369_boas_vindas_v1'

export function jaViuBoasVindas(userId: string | undefined): boolean {
  if (!userId) return true
  try { return localStorage.getItem(`${CHAVE}:${userId}`) === 'sim' } catch { return true }
}
function marcarVisto(userId: string | undefined) {
  if (!userId) return
  try { localStorage.setItem(`${CHAVE}:${userId}`, 'sim') } catch { /* modo privado */ }
}

interface Passo {
  eyebrow: string
  titulo: string
  texto: string
  visual: React.ReactNode
}

/* ---------- visuais de cada passo, em miniatura ---------- */

function TresNumeros() {
  const itens = [
    { v: '62', r: 'nota efetiva', c: 'var(--amber)' },
    { v: '70%', r: 'confiança', c: 'var(--tx2)' },
    { v: '92', r: 'potencial', c: 'var(--teal)' },
  ]
  return (
    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
      {itens.map((i) => (
        <div key={i.r} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 38, fontWeight: 800, letterSpacing: '-.04em', color: i.c, lineHeight: 1 }}>{i.v}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--tx3)', marginTop: 6 }}>{i.r}</div>
        </div>
      ))}
    </div>
  )
}

function Evidencia() {
  return (
    <div style={{ textAlign: 'left', maxWidth: 420, margin: '0 auto' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--tx3)' }}>Reajuste</div>
      <b style={{ fontSize: 15, display: 'block', margin: '2px 0 8px' }}>Preço fixo e irreajustável</b>
      <div style={{ background: 'var(--bg2)', borderLeft: '3px solid var(--brand)', borderRadius: '0 8px 8px 0', padding: '10px 13px', fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.55 }}>
        “…os preços serão fixos e irreajustáveis pelo período de vigência…”
        <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6, fontFamily: 'var(--mono)' }}>
          Edital 042-2026.pdf · p. 47 · item 14.3
        </div>
      </div>
    </div>
  )
}

function Fatores() {
  const f = [
    { l: 'Aderência ao edital', v: 0.8 },
    { l: 'Risco da operação', v: -0.32 },
    { l: 'Histórico da empresa', v: 0.18 },
    { l: 'Parceiro local', v: -1.2 },
  ]
  const max = 1.2
  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      {f.map((x) => {
        const larg = (Math.abs(x.v) / max) * 46
        const pos = x.v >= 0
        return (
          <div key={x.l} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 4, textAlign: 'left' }}>{x.l}</div>
            <div style={{ display: 'flex', height: 7, alignItems: 'center' }}>
              <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end' }}>
                {!pos && <span style={{ width: `${larg}%`, height: 7, background: 'var(--danger)', borderRadius: '20px 0 0 20px' }} />}
              </div>
              <span style={{ width: 1, height: 11, background: 'var(--line2)' }} />
              <div style={{ width: '50%' }}>
                {pos && <span style={{ display: 'block', width: `${larg}%`, height: 7, background: 'var(--teal)', borderRadius: '0 20px 20px 0' }} />}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const PASSOS: Passo[] = [
  {
    eyebrow: 'O que é',
    titulo: 'Uma estação de decisão, não um radar',
    texto: 'O X369life responde a uma pergunta só: vale a pena disputar este edital, e o que falta para disputar. '
      + 'Ele não sai caçando editais pelo mundo — você traz o edital, ele faz a conta e mostra de onde veio cada número.',
    visual: <Emblema tamanho={72} />,
  },
  {
    eyebrow: 'Aderência',
    titulo: 'Toda nota vem com a confiança dela',
    texto: 'Nove critérios comparam o edital com o perfil da sua empresa. Mas nota sozinha engana: '
      + 'critério sem dado entra como ausente e derruba a confiança, em vez de virar nota cheia. '
      + 'O potencial mostra até onde a nota vai se você preencher as lacunas.',
    visual: <TresNumeros />,
  },
  {
    eyebrow: 'Probabilidade',
    titulo: 'A chance de vitória é aberta, fator a fator',
    texto: 'Cada disputa recebe uma probabilidade — e a tela mostra o que puxa para cima e o que puxa para baixo. '
      + 'É um modelo causal explicável, não um modelo treinado em histórico. Você pode discordar de uma parcela específica.',
    visual: <Fatores />,
  },
  {
    eyebrow: 'Evidência',
    titulo: 'Nenhum dado aparece sem origem',
    texto: 'Todo campo extraído de um edital carrega documento, página, seção e o trecho literal. '
      + 'Numa reunião de comitê, “o sistema disse” não sustenta uma decisão de milhões — a citação sustenta.',
    visual: <Evidencia />,
  },
  {
    eyebrow: 'Decisão',
    titulo: 'O sistema recomenda; quem decide é você',
    texto: 'A recomendação sai dos números, com motivos e nível de confiança. A decisão exige justificativa e responsável, '
      + 'e fica registrada para sempre: rever uma decisão gera um novo registro, nunca apaga o anterior.',
    visual: (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {['Participar', 'Buscar parceiro', 'Reunir documentação', 'Aguardar', 'Não participar'].map((d, i) => (
          <span key={d} className="chip" style={i === 0 ? { borderColor: 'var(--brand)', color: 'var(--brand)', background: 'var(--brand-soft)', fontWeight: 700 } : undefined}>{d}</span>
        ))}
      </div>
    ),
  },
]

export default function BoasVindas({ onConcluir }: { onConcluir: () => void }) {
  const { usuario } = useAuth()
  const { orgNome } = useDados()
  const [i, setI] = useState(0)
  const [saindo, setSaindo] = useState(false)

  const ultimo = i === PASSOS.length - 1
  const p = PASSOS[i]

  function encerrar() {
    setSaindo(true)
    marcarVisto(usuario?.id)
    setTimeout(onConcluir, 260)
  }
  const avancar = () => (ultimo ? encerrar() : setI((n) => n + 1))
  const voltar = () => setI((n) => Math.max(0, n - 1))

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') avancar()
      if (e.key === 'ArrowLeft') voltar()
      if (e.key === 'Escape') encerrar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const primeiroNome = (usuario?.nome ?? '').trim().split(/\s+/)[0]

  return (
    <div className="x-acesso" style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20,
      opacity: saindo ? 0 : 1, transition: 'opacity .26s ease',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 620, padding: 0, overflow: 'hidden' }}>
        <div className="fileira-luz" style={{ borderRadius: 0, opacity: 1 }} />

        <div style={{ padding: '30px 34px 26px' }}>
          {i === 0 && (
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.16em', color: 'var(--brand)', margin: 0 }}>
                Bem-vindo{primeiroNome ? `, ${primeiroNome}` : ''}
              </p>
              <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', margin: '8px 0 0' }}>
                {APP.marca}<span style={{ fontWeight: 400, color: 'var(--tx2)' }}>{APP.sufixo}</span>
              </h1>
              {orgNome && (
                <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '4px 0 0' }}>{orgNome}</p>
              )}
            </div>
          )}

          {/* palco do passo */}
          <div key={i} style={{ animation: 'passoEntra .3s ease both', textAlign: 'center', padding: '22px 0 6px' }}>
            <div style={{ minHeight: 108, display: 'grid', placeItems: 'center', marginBottom: 20 }}>
              {p.visual}
            </div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.16em', color: 'var(--brand)', margin: 0 }}>
              {p.eyebrow}
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 750, letterSpacing: '-.03em', margin: '8px 0 10px', textWrap: 'balance' }}>
              {p.titulo}
            </h2>
            <p style={{ fontSize: 14.5, color: 'var(--tx2)', lineHeight: 1.62, margin: '0 auto', maxWidth: '52ch' }}>
              {p.texto}
            </p>
          </div>
        </div>

        {/* rodapé de navegação */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px 18px',
          borderTop: '1px solid var(--line)',
        }}>
          <button className="b-sm" onClick={encerrar} style={{ border: 'none', background: 'none', color: 'var(--tx3)' }}>
            Pular apresentação
          </button>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} role="tablist" aria-label="Progresso">
            {PASSOS.map((_, n) => (
              <button key={n} onClick={() => setI(n)} aria-label={`Passo ${n + 1}`} aria-selected={n === i}
                style={{
                  width: n === i ? 20 : 7, height: 7, borderRadius: 20, border: 'none', padding: 0, cursor: 'pointer',
                  background: n === i ? 'var(--brand)' : 'var(--line2)',
                  transition: 'width .24s ease, background .24s ease',
                }} />
            ))}
          </div>
          <span style={{ flex: 1 }} />
          {i > 0 && <button className="b-ghost" onClick={voltar}>Voltar</button>}
          <button className="b" onClick={avancar}>{ultimo ? 'Começar' : 'Avançar'}</button>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--tx3)', marginTop: 14, fontFamily: 'var(--mono)', letterSpacing: '.04em' }}>
        {APP.nome} v{APP.versao} · {APP.rodape}
      </p>
    </div>
  )
}
