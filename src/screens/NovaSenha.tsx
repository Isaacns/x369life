import { useState, type FormEvent } from 'react'
import { APP } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { Campo, CampoSenha } from '../ui/kit'
import { Marca } from '../ui/Marca'

/* Fim do fluxo de recuperação: o link do e-mail devolve uma sessão de
   recuperação, e é aqui que a pessoa define a senha nova. Quem digita é
   ela — a senha não passa por mais ninguém. */
export default function NovaSenha() {
  const { definirSenha, sair, usuario } = useAuth()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)

  const curta = senha.length > 0 && senha.length < 8
  const divergem = confirma.length > 0 && senha !== confirma
  const valido = senha.length >= 8 && senha === confirma

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null); setOcupado(true)
    const msg = await definirSenha(senha)
    setOcupado(false)
    if (msg) { setErro(msg); return }
    setPronto(true)
  }

  return (
    <div className="x-acesso" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 416 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fileira-luz" style={{ borderRadius: 0, opacity: 1 }} />
          <div style={{ padding: '30px 28px 32px' }}>
            <Marca tamanho={36} respira anel />

            {pronto ? (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', margin: '20px 0 0' }}>
                  Senha definida
                </h1>
                <p style={{ color: 'var(--tx2)', fontSize: 13.5, margin: '6px 0 22px', lineHeight: 1.55 }}>
                  Sua senha foi atualizada e você já está dentro do sistema.
                </p>
                <button className="b b-full" onClick={() => window.location.replace('/')}>
                  Entrar no X369life
                </button>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', margin: '20px 0 0' }}>
                  Definir nova senha
                </h1>
                <p style={{ color: 'var(--tx2)', fontSize: 13.5, margin: '6px 0 22px', lineHeight: 1.55 }}>
                  {usuario?.email
                    ? <>Você chegou pelo link de recuperação de <b>{usuario.email}</b>. Escolha a senha nova.</>
                    : 'Escolha a senha nova.'}
                </p>

                {erro && (
                  <div role="alert" style={{ border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, marginBottom: 14 }}>
                    {erro}
                  </div>
                )}

                <form onSubmit={enviar}>
                  <Campo label="Nova senha" dica="Mínimo de 8 caracteres.">
                    <CampoSenha required autoFocus autoComplete="new-password" minLength={8}
                      value={senha} onChange={(e) => setSenha(e.target.value)} />
                  </Campo>
                  <Campo label="Repita a nova senha">
                    <CampoSenha required autoComplete="new-password"
                      value={confirma} onChange={(e) => setConfirma(e.target.value)} />
                  </Campo>

                  {curta && <p style={avisoEstilo}>A senha precisa de ao menos 8 caracteres.</p>}
                  {divergem && <p style={avisoEstilo}>As duas senhas não conferem.</p>}

                  <button className="b b-full" type="submit" disabled={!valido || ocupado}>
                    {ocupado ? 'Salvando…' : 'Salvar senha'}
                  </button>
                </form>

                <p style={{ marginTop: 15, fontSize: 13, textAlign: 'center', color: 'var(--tx2)' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); void sair() }}>Cancelar e voltar</a>
                </p>
              </>
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

const avisoEstilo: React.CSSProperties = {
  fontSize: 12, color: 'var(--amber)', margin: '-6px 0 12px',
}
