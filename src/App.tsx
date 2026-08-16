import { useEffect, useState, type JSX } from 'react'
import { APP, MODO_DEMO, NAV, PERFIS, type NavId, type Perfil } from './app.config'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { DadosProvider, useDados } from './lib/dados'
import { iniciais } from './lib/formato'
import { Carregando, ToastHost } from './ui/kit'
import { TemaProvider, useTema } from './ui/tema'
import { NavegacaoProvider, useNavegacao } from './ui/navegacao'
import { Marca } from './ui/Marca'
import Login from './screens/Login'
import Onboarding from './screens/Onboarding'
import NovaSenha from './screens/NovaSenha'
import Visao from './screens/Visao'
import Executivo from './screens/Executivo'
import Oportunidades from './screens/Oportunidades'
import Pipeline from './screens/Pipeline'
import Relatorios from './screens/Relatorios'
import Inteligencia from './screens/Inteligencia'
import Fontes from './screens/Fontes'
import Usuarios from './screens/Usuarios'
import Config from './screens/Config'
import EmBreve from './screens/EmBreve'

const TELAS: Partial<Record<NavId, () => JSX.Element>> = {
  visao: Visao, executivo: Executivo, oportunidades: Oportunidades, pipeline: Pipeline,
  relatorios: Relatorios, inteligencia: Inteligencia, fontes: Fontes,
  usuarios: Usuarios, config: Config,
}

function Shell() {
  const { usuario, sair } = useAuth()
  const { tema, alternar } = useTema()
  const { view, ir } = useNavegacao()
  const [menuAberto, setMenuAberto] = useState(false)

  const item = NAV.find((n) => n.id === view)
  const Tela = TELAS[view] ?? (() => <EmBreve titulo={item?.label ?? ''} />)
  const perfil = (usuario?.perfil ?? 'visualizador') as Perfil
  const grupos = [...new Set(NAV.map((n) => n.grupo))]

  function navegar(id: NavId) { ir(id); setMenuAberto(false) }

  return (
    <div className="x-shell">
      {menuAberto && <div className="x-veu nao-imprime" onClick={() => setMenuAberto(false)} />}

      <aside className={'x-side nao-imprime' + (menuAberto ? ' aberta' : '')}>
        <div style={{ padding: '0 10px 6px' }}>
          <Marca tamanho={32} sobreEscuro />
        </div>

        <nav>
          {grupos.map((g) => (
            <div key={g}>
              <div className="grupo">{g}</div>
              {NAV.filter((n) => n.grupo === g).map((n) => (
                <button key={n.id} className={'x-nav' + (view === n.id ? ' on' : '')} onClick={() => navegar(n.id)}>
                  <span className="ic" aria-hidden>{n.icone}</span>
                  {n.label}
                  {!n.pronto && <span className="soon">Lote 5</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ flex: 1, minHeight: 18 }} />
        <button className="x-nav" onClick={() => void sair()}>
          <span className="ic" aria-hidden>⏻</span>Sair
        </button>
        <div className="fileira-luz" style={{ margin: '10px 12px 8px' }} />
        <div style={{ fontSize: 10, color: '#5B6E85', padding: '0 12px', fontFamily: 'var(--mono)', letterSpacing: '.04em' }}>
          v{APP.versao} · {APP.rodape}
        </div>
      </aside>

      <div className="x-main">
        <header className="x-top nao-imprime">
          <button className="x-burger" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">☰</button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>{item?.label}</h2>
          </div>

          <button className="b-sm" onClick={alternar} title="Alternar tema" aria-label="Alternar tema">
            {tema === 'claro' ? '◐' : '◑'}
          </button>

          {/* §8.1 dos padrões VIZIO — quem está logado, sempre no topo à direita */}
          <button className="x-user" onClick={() => navegar('usuarios')} title="Usuários e perfis">
            <span className="who">
              <b>{usuario?.nome}</b>
              <span>{PERFIS[perfil]?.label ?? perfil}</span>
            </span>
            <span className="av">{iniciais(usuario?.nome ?? '')}</span>
          </button>
        </header>

        <main className="x-content"><Tela /></main>
      </div>
    </div>
  )
}

function Interior() {
  const { carregando, precisaOnboarding, recarregarOrg } = useDados()
  if (carregando) return <Carregando />
  if (precisaOnboarding) return <Onboarding onPronto={() => void recarregarOrg()} />
  return <NavegacaoProvider><Shell /></NavegacaoProvider>
}

function Portao() {
  const { carregando, usuario, emRecuperacao } = useAuth()
  if (carregando) return <Carregando />
  if (!usuario) return <Login />
  // Sessão de recuperação não entra no sistema: define a senha primeiro.
  if (emRecuperacao) return <NovaSenha />
  return <DadosProvider><Interior /></DadosProvider>
}

export default function App() {
  useEffect(() => {
    document.title = MODO_DEMO ? `${APP.nome} · demonstração` : APP.nome
  }, [])
  return (
    <TemaProvider>
      <ToastHost><AuthProvider><Portao /></AuthProvider></ToastHost>
    </TemaProvider>
  )
}
