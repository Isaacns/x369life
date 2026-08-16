/* ============================================================
   Autenticação.
   · Modo real: Supabase Auth (sessão persistente, recuperação de senha).
   · Modo demonstrativo: sessão local, SEM rede, apenas com os usuários
     fictícios de `demo.ts` e senha declarada na própria tela. Existe só
     enquanto não há projeto Supabase provisionado — some sozinho quando
     as variáveis VITE_SUPABASE_* aparecem no build.
   ============================================================ */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { MODO_DEMO, type Perfil } from '../app.config'
import { sb } from '../lib/supabase'
import { USUARIOS_DEMO } from '../lib/demo'
import type { Usuario } from '../lib/tipos'

export const SENHA_DEMO = 'demo1234'
const CHAVE_SESSAO = 'x369_sessao_demo'

interface Estado {
  carregando: boolean
  usuario: Usuario | null
  perfil: Perfil | null
  entrar: (email: string, senha: string) => Promise<string | null>
  criarConta: (nome: string, email: string, senha: string) => Promise<string | null>
  recuperar: (email: string) => Promise<string | null>
  sair: () => Promise<void>
  atualizarUsuario: (u: Partial<Usuario>) => void
}

const Ctx = createContext<Estado | null>(null)
export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fora do AuthProvider')
  return v
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  useEffect(() => {
    if (MODO_DEMO) {
      const salvo = localStorage.getItem(CHAVE_SESSAO)
      if (salvo) {
        const u = USUARIOS_DEMO.find((x) => x.email === salvo && x.ativo)
        if (u) setUsuario(u)
      }
      setCarregando(false)
      return
    }
    if (!sb) return
    void sb.auth.getSession().then(({ data }) => {
      aplicarSessao(data.session?.user?.email ?? null, data.session?.user?.id ?? null,
        (data.session?.user?.user_metadata?.nome as string | undefined) ?? null)
      setCarregando(false)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      aplicarSessao(s?.user?.email ?? null, s?.user?.id ?? null,
        (s?.user?.user_metadata?.nome as string | undefined) ?? null)
      setCarregando(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  function aplicarSessao(email: string | null, id: string | null, nome: string | null) {
    if (!email || !id) { setUsuario(null); return }
    // O papel real vem do RBAC no banco (memberships). Sessão sem cadastro
    // correspondente recebe o perfil MÍNIMO — §13.1 dos padrões VIZIO.
    setUsuario({ id, nome: nome ?? email.split('@')[0], email, perfil: 'visualizador', ativo: true })
  }

  const valor: Estado = {
    carregando, usuario,
    perfil: (usuario?.perfil as Perfil | undefined) ?? null,

    entrar: async (email, senha) => {
      const e = email.trim().toLowerCase()
      if (MODO_DEMO) {
        const u = USUARIOS_DEMO.find((x) => x.email.toLowerCase() === e)
        if (!u) return 'E-mail não encontrado nos dados demonstrativos.'
        if (!u.ativo) return 'Este usuário está inativo. Fale com o administrador.'
        if (senha !== SENHA_DEMO) return 'E-mail ou senha incorretos.'
        localStorage.setItem(CHAVE_SESSAO, u.email)
        setUsuario(u)
        return null
      }
      if (!sb) return 'Backend não configurado.'
      const { error } = await sb.auth.signInWithPassword({ email: e, password: senha })
      if (!error) return null
      return error.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : error.message
    },

    criarConta: async (nome, email, senha) => {
      const e = email.trim().toLowerCase()
      if (nome.trim().length < 3) return 'Informe seu nome completo.'
      if (senha.length < 8) return 'A senha precisa de ao menos 8 caracteres.'
      if (MODO_DEMO) {
        return 'DEMO: criação de conta exige o backend configurado. '
          + 'Entre com uma das contas de demonstração listadas abaixo.'
      }
      if (!sb) return 'Backend não configurado.'
      const { data, error } = await sb.auth.signUp({
        email: e, password: senha, options: { data: { nome: nome.trim() } },
      })
      if (error) {
        const m = error.message.toLowerCase()
        // O vizio-core é backend compartilhado e mantém o cadastro público
        // desativado de propósito. Dizer isso, em vez de repassar o erro cru.
        if (m.includes('signup') && m.includes('not allowed')) {
          return 'O cadastro neste ambiente é sob convite. Peça a um administrador '
            + 'para liberar seu acesso — depois entre com e-mail e senha.'
        }
        if (m.includes('already registered')) {
          return 'Já existe uma conta com este e-mail. Use "Entrar".'
        }
        return error.message
      }
      if (!data.session) {
        return 'DEMO: conta criada. Confirme pelo e-mail que enviamos e depois entre.'
      }
      return null
    },

    recuperar: async (email) => {
      const e = email.trim().toLowerCase()
      if (!e) return 'Informe o e-mail da sua conta.'
      if (MODO_DEMO) {
        return 'DEMO: no modo demonstrativo não há envio de e-mail. '
          + 'Com o backend configurado, um link de redefinição é enviado para este endereço.'
      }
      if (!sb) return 'Backend não configurado.'
      const { error } = await sb.auth.resetPasswordForEmail(e, {
        redirectTo: window.location.origin + '/#/nova-senha',
      })
      return error ? error.message : null
    },

    sair: async () => {
      if (MODO_DEMO) { localStorage.removeItem(CHAVE_SESSAO); setUsuario(null); return }
      await sb?.auth.signOut()
    },

    atualizarUsuario: (u) => setUsuario((s) => (s ? { ...s, ...u } : s)),
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
