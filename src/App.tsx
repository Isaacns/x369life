import { useEffect, useState, type JSX } from 'react'
import { APP, MODO_DEMO, NAV, PERFIS, podeAdministrar, type NavId, type Perfil } from './app.config'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { DadosProvider, useDados } from './lib/dados'
import { MODULOS, podeVerModulo } from './lib/permissoes'
import { Carregando, ToastHost } from './ui/kit'
import { TemaProvider, useTema } from './ui/tema'
import { NavegacaoProvider, useNavegacao } from './ui/navegacao'
import { FundoVivo, Marca } from './ui/Marca'
import { Retrato } from './ui/Retrato'
import { Icone } from './ui/Icone'
import Login from './screens/Login'
import Onboarding from './screens/Onboarding'
import NovaSenha from './screens/NovaSenha'
import BoasVindas, { jaViuBoasVindas } from './screens/BoasVindas'
import MeuPerfil from './screens/MeuPerfil'
import Visao from './screens/Visao'
import Executivo from './screens/Executivo'
import Oportunidades from './screens/Oportunidades'
import Pipeline from './screens/Pipeline'
import Agenda from './screens/Agenda'
import Relatorios from './screens/Relatorios'
import Inteligencia from './screens/Inteligencia'
import Fontes from './screens/Fontes'
import Mercados from './screens/Mercados'
import Legislacao from './screens/Legislacao'
import Produtos from './screens/Produtos'
import Comparador from './screens/Comparador'
import Organizacoes from './screens/Organizacoes'
import Usuarios from './screens/Usuarios'
import Config from './screens/Config'
import EmBreve from './screens/EmBreve'

/* O que a equipe abre todo dia. O resto continua a um toque, em "Mais" —
   nada some no celular, só muda de lugar. */
const PRINCIPAIS: NavId[] = ['visao', 'oportunidades', 'pipeline', 'agenda']

/* Rótulo curto só para a barra: "Oportunidades" em 73px fica espremido na
   borda. "Editais" é a palavra que a equipe usa e cabe com folga. */
const CURTO: Partial<Record<NavId, string>> = {
  visao: 'Visão', oportunidades: 'Editais', pipeline: 'Pipeline', agenda: 'Agenda',
}

const TELAS: Partial<Record<NavId, () => JSX.Element>> = {
  visao: Visao, executivo: Executivo, oportunidades: Oportunidades, pipeline: Pipeline, agenda: Agenda,
  relatorios: Relatorios, inteligencia: Inteligencia, fontes: Fontes,
  mercados: Mercados, legislacao: Legislacao,
  produtos: Produtos, comparador: Comparador,
  organizacoes: Organizacoes, usuarios: Usuarios, config: Config,
}

function Shell() {
  const { usuario, sair } = useAuth()
  const { tema, alternar } = useTema()
  const { view, ir } = useNavegacao()
  const [menuAberto, setMenuAberto] = useState(false)
  const [ficha, setFicha] = useState(false)

  const item = NAV.find((n) => n.id === view)
  const Tela = TELAS[view] ?? (() => <EmBreve titulo={item?.label ?? ''} />)
  const perfil = (usuario?.perfil ?? 'visualizador') as Perfil

  // Módulo sem permissão não aparece no menu. `usuarios` e `config` não entram
  // na matriz — quem decide neles é o próprio perfil (§8 dos padrões VIZIO).
  const comAjuste = new Set(MODULOS.map((m) => m.id))
  const visiveis = NAV.filter((n) => (comAjuste.has(n.id)
    ? podeVerModulo(perfil, usuario?.permissoes, n.id)
    : n.id === 'usuarios' || n.id === 'config' || n.id === 'organizacoes'
      ? podeAdministrar(perfil) : true))
  const grupos = [...new Set(visiveis.map((n) => n.grupo))]

  function navegar(id: NavId) { ir(id); setMenuAberto(false) }

  return (
    <div className="x-shell">
      {menuAberto && <div className="x-veu nao-imprime" onClick={() => setMenuAberto(false)} />}

      <aside className={'x-side nao-imprime' + (menuAberto ? ' aberta' : '')}>
        <div style={{ padding: '0 10px 6px' }}>
          <Marca tamanho={32} sobreEscuro respira />
        </div>

        <nav>
          {grupos.map((g) => (
            <div key={g}>
              <div className="grupo">{g}</div>
              {visiveis.filter((n) => n.grupo === g).map((n) => (
                <button key={n.id} className={'x-nav' + (view === n.id ? ' on' : '')} onClick={() => navegar(n.id)}>
                  <span className="ic" aria-hidden><Icone id={n.id} tamanho={17} /></span>
                  {n.label}
                  {!n.pronto && <span className="soon">Lote 5</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ flex: 1, minHeight: 18 }} />
        <button className="x-nav" onClick={() => void sair()}>
          <span className="ic" aria-hidden><Icone id="sair" tamanho={17} /></span>Sair
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

          <button className="b-sm" onClick={alternar}
            title={tema === 'claro' ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'}
            aria-label={tema === 'claro' ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'}>
            <Icone id="tema" tamanho={17} />
          </button>

          {/* §8.1 dos padrões VIZIO — quem está logado, ver/editar e sair,
              sempre no topo à direita. */}
          <button className="x-user" onClick={() => setFicha(true)} title="Ver e editar meu perfil">
            <span className="who">
              <b>{usuario?.nome}</b>
              <span>{PERFIS[perfil]?.label ?? perfil}</span>
            </span>
            <Retrato nome={usuario?.nome ?? ''} url={usuario?.fotoUrl} />
          </button>
          <button className="b-sm" onClick={() => void sair()} title="Sair" aria-label="Sair">
            <Icone id="sair" tamanho={17} />
          </button>
        </header>

        {ficha && <MeuPerfil onFechar={() => setFicha(false)} />}

        {/* Navegação na zona do polegar. Os quatro destinos do trabalho diário
            ficam diretos; o resto entra por "Mais", que abre a gaveta. */}
        <nav className="x-barra nao-imprime" aria-label="Navegação principal">
          {visiveis.filter((n) => PRINCIPAIS.includes(n.id)).map((n) => (
            <button key={n.id} className={view === n.id ? 'on' : undefined}
              aria-current={view === n.id ? 'page' : undefined}
              onClick={() => navegar(n.id)}>
              <Icone id={n.id} tamanho={22} />
              {CURTO[n.id] ?? n.label}
            </button>
          ))}
          <button onClick={() => setMenuAberto(true)} aria-expanded={menuAberto}>
            <Icone id="mais" tamanho={22} />
            Mais
          </button>
        </nav>

        <main className="x-content"><Tela /></main>
      </div>
    </div>
  )
}

function Interior() {
  const { carregando, precisaOnboarding, recarregarOrg } = useDados()
  const { usuario } = useAuth()
  const [apresentar, setApresentar] = useState(() => !jaViuBoasVindas(usuario?.id))
  if (carregando) return <Carregando />
  if (precisaOnboarding) return <Onboarding onPronto={() => void recarregarOrg()} />
  // Apresentação do sistema: só no primeiro acesso de cada pessoa.
  if (apresentar) return <BoasVindas onConcluir={() => setApresentar(false)} />
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
      <FundoVivo />
      <ToastHost><AuthProvider><Portao /></AuthProvider></ToastHost>
    </TemaProvider>
  )
}
