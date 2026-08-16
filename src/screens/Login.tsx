import { useState, type FormEvent } from 'react'
import { APP, MODO_DEMO } from '../app.config'
import { SENHA_DEMO, useAuth } from '../auth/AuthContext'
import { USUARIOS_DEMO } from '../lib/demo'
import { Campo, CampoSenha } from '../ui/kit'
import { Marca } from '../ui/Marca'

type Modo = 'entrar' | 'criar' | 'recuperar'

export default function Login() {
  const { entrar, criarConta, recuperar } = useAuth()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function trocar(m: Modo) { setModo(m); setErro(null); setAviso(null) }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null); setAviso(null); setOcupado(true)
    let msg: string | null = null
    if (modo === 'entrar') msg = await entrar(email, senha)
    else if (modo === 'criar') msg = await criarConta(nome, email, senha)
    else msg = await recuperar(email)

    if (msg?.startsWith('DEMO:')) setAviso(msg.slice(5).trim())
    else if (msg) setErro(msg)
    else if (modo === 'recuperar') setAviso('Se existir uma conta com este e-mail, o link de redefinição foi enviado.')
    setOcupado(false)
  }

  const titulo = modo === 'entrar' ? 'Entrar'
    : modo === 'criar' ? 'Criar conta' : 'Recuperar acesso'
  const chamada = modo === 'entrar' ? APP.chamadaLogin
    : modo === 'criar' ? 'Você cria a conta, depois cadastra a organização que vai ser comparada com cada edital.'
      : 'Informe o e-mail da sua conta. Você receberá um link para definir uma nova senha.'

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 416 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* assinatura da marca: a fileira de pontos de luz */}
          <div className="fileira-luz" style={{ borderRadius: 0, opacity: 1 }} />

          <div style={{ padding: '30px 28px 32px' }}>
            <Marca tamanho={36} />

            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', margin: '20px 0 0' }}>
              {titulo}
            </h1>
            <p style={{ color: 'var(--tx2)', fontSize: 13.5, margin: '6px 0 22px', lineHeight: 1.55 }}>
              {chamada}
            </p>

            {erro && <div role="alert" style={caixa('var(--danger)')}>{erro}</div>}
            {aviso && <div role="status" style={caixa('var(--info)')}>{aviso}</div>}

            <form onSubmit={enviar}>
              {modo === 'criar' && (
                <Campo label="Seu nome">
                  <input className="inp" required autoFocus value={nome}
                    onChange={(e) => setNome(e.target.value)} autoComplete="name" />
                </Campo>
              )}

              <Campo label="E-mail">
                <input className="inp" type="email" autoComplete="email" required
                  autoFocus={modo !== 'criar'}
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </Campo>

              {modo !== 'recuperar' && (
                <Campo label={modo === 'criar' ? 'Senha (mínimo 8 caracteres)' : 'Senha'}>
                  <CampoSenha required value={senha} minLength={modo === 'criar' ? 8 : undefined}
                    autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                    onChange={(e) => setSenha(e.target.value)} />
                </Campo>
              )}

              <button className="b b-full" type="submit" disabled={ocupado}>
                {ocupado ? 'Aguarde…'
                  : modo === 'entrar' ? 'Entrar'
                    : modo === 'criar' ? 'Criar conta' : 'Enviar link de recuperação'}
              </button>
            </form>

            <p style={{ marginTop: 15, fontSize: 13, textAlign: 'center', color: 'var(--tx2)' }}>
              {modo === 'entrar' && (
                <>
                  <a href="#" onClick={(e) => { e.preventDefault(); trocar('criar') }}>Criar conta</a>
                  <span style={{ color: 'var(--tx3)' }}> · </span>
                  <a href="#" onClick={(e) => { e.preventDefault(); trocar('recuperar') }}>Esqueci minha senha</a>
                </>
              )}
              {modo !== 'entrar' && (
                <a href="#" onClick={(e) => { e.preventDefault(); trocar('entrar') }}>Voltar para o acesso</a>
              )}
            </p>

            {MODO_DEMO && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                <div className="faixa faixa-demo" style={{ marginBottom: 10 }}>
                  <span>⚠</span>Ambiente demonstrativo — backend não configurado neste build.
                </div>
                <p style={{ fontSize: 12, color: 'var(--tx2)', margin: '0 0 8px' }}>
                  Contas fictícias para navegar (senha <b>{SENHA_DEMO}</b>):
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {USUARIOS_DEMO.filter((u) => u.ativo).map((u) => (
                    <button key={u.id} type="button" className="chip"
                      onClick={() => { setEmail(u.email); setSenha(SENHA_DEMO); trocar('entrar') }}>
                      {u.nome.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--tx3)', marginTop: 14, fontFamily: 'var(--mono)', letterSpacing: '.04em' }}>
          {APP.nome} v{APP.versao} · {APP.rodape}
        </p>
      </div>
    </div>
  )
}

const caixa = (c: string): React.CSSProperties => ({
  border: `1px solid ${c}`, color: c, borderRadius: 10,
  padding: '9px 12px', fontSize: 12.5, marginBottom: 14, lineHeight: 1.45,
})
