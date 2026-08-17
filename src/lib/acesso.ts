import type { Perfil } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { podeEditarModulo, podeVerModulo } from './permissoes'

/* O acesso a um módulo em uma linha, para a tela não ter que remontar
   perfil + ajuste toda vez. Existir este atalho é o que evita a falha que a
   revisão encontrou: matriz configurada em Usuários e ignorada nas telas que
   escrevem — restrição que o administrador acredita ter aplicado e não valeu. */
export function useAcesso(modulo: string) {
  const { usuario } = useAuth()
  const perfil = (usuario?.perfil ?? 'visualizador') as Perfil
  return {
    ver: podeVerModulo(perfil, usuario?.permissoes, modulo),
    editar: podeEditarModulo(perfil, usuario?.permissoes, modulo),
  }
}
