/* Kit de UI do X369life. Herdado de VIZIO/_template-react-supabase e
   ampliado. Tudo usa as classes de index.css — sem estilo solto. */
import {
  createContext, useCallback, useContext, useState,
  type InputHTMLAttributes, type ReactNode,
} from 'react'
import { AVISO_DEMO, AVISO_LEGAL } from '../app.config'

/* ---------- Toast ---------- */
type Toast = { id: number; msg: string; err?: boolean }
const ToastCtx = createContext<(msg: string, err?: boolean) => void>(() => {})
export function useToast() { return useContext(ToastCtx) }

export function ToastHost({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Toast[]>([])
  const push = useCallback((msg: string, err?: boolean) => {
    const id = performance.now()
    setItens((s) => [...s, { id, msg, err }])
    setTimeout(() => setItens((s) => s.filter((t) => t.id !== id)), err ? 6000 : 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="nao-imprime" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 90, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
        {itens.map((t) => (
          <div key={t.id} role="status" className="card" style={{ padding: '11px 14px 11px 34px', fontSize: 13, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: t.err ? 'var(--danger)' : 'var(--teal)', fontWeight: 700 }}>{t.err ? '!' : '✓'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------- Modal ---------- */
export function Modal({ titulo, largura = 480, children, onFechar }:
{ titulo: string; largura?: number; children: ReactNode; onFechar: () => void }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,26,47,.45)', zIndex: 70, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div role="dialog" aria-modal className="card" style={{ width: '100%', maxWidth: largura, maxHeight: '92vh', overflowY: 'auto', padding: 22 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{titulo}</h3>
        {children}
      </div>
    </div>
  )
}
export function Rodape({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>{children}</div>
}

/* ---------- formulário ---------- */
export function Campo({ label, children, dica }: { label: string; children: ReactNode; dica?: string }) {
  return (
    <label className="fld">
      <span>{label}</span>
      {children}
      {dica && <em style={{ display: 'block', fontStyle: 'normal', fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>{dica}</em>}
    </label>
  )
}

/* §18 dos padrões VIZIO: TODO campo de senha tem botão de olho. */
export function CampoSenha(props: InputHTMLAttributes<HTMLInputElement>) {
  const [ver, setVer] = useState(false)
  return (
    <div className="pw">
      <input {...props} className="inp" type={ver ? 'text' : 'password'} style={{ paddingRight: 40, ...props.style }} />
      <button type="button" className="eye" tabIndex={-1} onClick={() => setVer((s) => !s)}
        aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'} title={ver ? 'Ocultar senha' : 'Mostrar senha'}>
        {ver ? '🙈' : '👁'}
      </button>
    </div>
  )
}

/* ---------- indicadores ---------- */
export function Badge({ children, cor }: { children: ReactNode; cor: string }) {
  return (
    <span className="badge" style={{ color: cor, background: `color-mix(in srgb, ${cor} 13%, transparent)` }}>
      <span className="dot" />{children}
    </span>
  )
}

export function Barra({ valor, cor, altura = 6 }: { valor: number; cor: string; altura?: number }) {
  return (
    <div className="bar" style={{ height: altura }}>
      <i style={{ width: `${Math.max(0, Math.min(100, valor))}%`, background: cor }} />
    </div>
  )
}

export function Stat({ rotulo, valor, sub, cor }:
{ rotulo: string; valor: ReactNode; sub?: ReactNode; cor?: string }) {
  return (
    <div className="card stat">
      <div className="k">{rotulo}</div>
      <div className="v" style={cor ? { color: cor } : undefined}>{valor}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  )
}

/* ---------- estados de tela (§34 do briefing) ---------- */
export function Vazio({ ico = '◌', titulo, texto, children }:
{ ico?: string; titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '44px 20px' }}>
      <div style={{ fontSize: 26, marginBottom: 10, color: 'var(--tx3)' }}>{ico}</div>
      <b style={{ display: 'block', marginBottom: 5 }}>{titulo}</b>
      <p style={{ fontSize: 13, color: 'var(--tx2)', maxWidth: 400, margin: '0 auto 16px' }}>{texto}</p>
      {children}
    </div>
  )
}
export function Carregando() {
  return <div style={{ padding: 36, textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>Carregando…</div>
}
export function SemPermissao() {
  return <Vazio ico="⛔" titulo="Permissão negada" texto="Seu perfil não tem acesso a esta área. Fale com um administrador da organização." />
}
export function Erro({ texto, onTentar }: { texto: string; onTentar?: () => void }) {
  return (
    <div role="alert" className="card card-p" style={{ borderColor: 'var(--danger)' }}>
      <b style={{ color: 'var(--danger)', display: 'block', marginBottom: 4 }}>Algo deu errado</b>
      <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 12px' }}>{texto}</p>
      {onTentar && <button className="b-sm" onClick={onTentar}>Tentar de novo</button>}
    </div>
  )
}

/* ---------- faixas obrigatórias ---------- */
export function FaixaDemo() {
  return <div className="faixa faixa-demo" role="note"><span>⚠</span>{AVISO_DEMO}</div>
}
export function FaixaLegal() {
  return <div className="faixa faixa-legal" role="note"><span>§</span>{AVISO_LEGAL}</div>
}

/* ---------- abas ---------- */
export function Abas<T extends string>({ itens, ativa, onTrocar }:
{ itens: { id: T; label: string; contagem?: number }[]; ativa: T; onTrocar: (id: T) => void }) {
  return (
    <div className="abas" role="tablist">
      {itens.map((i) => (
        <button key={i.id} role="tab" aria-selected={ativa === i.id}
          className={'aba' + (ativa === i.id ? ' on' : '')} onClick={() => onTrocar(i.id)}>
          {i.label}{typeof i.contagem === 'number' && <span style={{ opacity: .6 }}> · {i.contagem}</span>}
        </button>
      ))}
    </div>
  )
}
