import { useMemo, useState } from 'react'
import { MODO_DEMO, PERFIS, PERFIS_LISTA, podeAdministrar, type Perfil } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { useDados } from '../lib/dados'
import { dataHora } from '../lib/formato'
import {
  acessoTotal, MODULOS, tetoDoPerfil, type Permissoes,
} from '../lib/permissoes'
import type { Usuario } from '../lib/tipos'
import { Retrato } from '../ui/Retrato'
import { Badge, Campo, CampoSenha, FaixaDemo, Modal, Rodape, Stat, useToast, Vazio } from '../ui/kit'

/* ============================================================
   Usuários & Acessos — padrão do Inovar:
   KPIs no topo · cartão por pessoa com foto, nível hierárquico e situação ·
   ficha com perfil + matriz Ver/Editar por módulo · desativar sem apagar.

   Duas travas herdadas do Inovar, que existem para o sistema não se trancar
   sozinho: ninguém rebaixa a si mesmo, e o último administrador ativo não
   pode ser rebaixado nem desativado.
   ============================================================ */

const corDoNivel = (n: number) =>
  n >= 90 ? 'var(--brand)' : n >= 50 ? 'var(--teal)' : n >= 30 ? 'var(--amber)' : 'var(--tx3)'

export default function Usuarios() {
  const { usuarios, salvarUsuario, removerUsuario } = useDados()
  const { usuario: eu } = useAuth()
  const toast = useToast()
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [novo, setNovo] = useState(false)

  const admin = podeAdministrar((eu?.perfil ?? null) as Perfil | null)

  const ativos = usuarios.filter((u) => u.ativo).length
  const administradores = usuarios.filter(
    (u) => u.ativo && (PERFIS[u.perfil as Perfil]?.nivel ?? 0) >= 90).length

  /* Quem é o último administrador ativo não pode ser rebaixado nem desativado —
     senão a organização fica sem ninguém que possa conceder acesso. */
  const soUmAdmin = administradores <= 1
  const ehUltimoAdmin = (u: Usuario) =>
    soUmAdmin && u.ativo && (PERFIS[u.perfil as Perfil]?.nivel ?? 0) >= 90

  async function alternarAtivo(u: Usuario) {
    if (ehUltimoAdmin(u)) {
      toast('Este é o único administrador ativo. Promova outra pessoa antes de desativá-lo.', true)
      return
    }
    if (u.ativo) { await removerUsuario(u.id); toast('Acesso desativado.'); return }
    const msg = await salvarUsuario({ ...u, ativo: true })
    if (msg) { toast(msg, true); return }
    toast('Acesso reativado.')
  }

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h" style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>Usuários e acessos</h1>
          <p>Quem acessa, com qual permissão. <b>Desativar</b> bloqueia o acesso sem apagar a pessoa nem a trilha do que ela decidiu.</p>
        </div>
        {admin && (
          <button className="b nao-imprime" onClick={() => { setEditando(null); setNovo(true) }}>
            + Novo usuário
          </button>
        )}
      </div>

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <Stat rotulo="Usuários" valor={String(usuarios.length)} sub="cadastrados" />
        <Stat rotulo="Ativos" valor={String(ativos)} sub="com acesso" cor="var(--teal)" />
        <Stat rotulo="Administradores" valor={String(administradores)} sub="acesso total" cor="var(--brand)" />
      </div>

      {!admin && (
        <div className="faixa faixa-legal">
          <span>⛔</span>Seu perfil ({PERFIS[(eu?.perfil ?? 'visualizador') as Perfil].label}) permite consultar a equipe, mas não alterar. Fale com um administrador.
        </div>
      )}

      {usuarios.length === 0 ? (
        <div className="card card-p">
          <Vazio titulo="Nenhum usuário" texto="Cadastre o primeiro usuário da organização." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {usuarios.map((u) => {
            const p = (u.perfil as Perfil)
            const nivel = PERFIS[p]?.nivel ?? 0
            const souEu = u.id === eu?.id
            return (
              <div key={u.id} className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', opacity: u.ativo ? 1 : 0.62 }}>
                <Retrato nome={u.nome} url={u.fotoUrl} tamanho={46} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 650, fontSize: 14.5 }}>
                    {u.nome}{souEu && <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 400 }}> · você</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                    <Badge cor={corDoNivel(nivel)}>{PERFIS[p]?.label ?? u.perfil} · N{nivel}</Badge>
                    <Badge cor={u.ativo ? 'var(--teal)' : 'var(--danger)'}>{u.ativo ? 'ativo' : 'inativo'}</Badge>
                    <span style={{ fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
                      {u.ultimoAcesso ? dataHora(u.ultimoAcesso) : 'nunca acessou'}
                    </span>
                  </div>
                </div>

                {admin && (
                  <div className="nao-imprime" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="b-sm" onClick={() => setEditando(u)}>✎ Editar</button>
                    <button className="b-sm" disabled={souEu || ehUltimoAdmin(u)}
                      title={souEu ? 'Você não pode desativar o próprio acesso.' : undefined}
                      style={{ color: u.ativo ? 'var(--amber)' : 'var(--teal)' }}
                      onClick={() => void alternarAtivo(u)}>
                      {u.ativo ? '⏸ Desativar' : '✓ Reativar'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '0 0 16px', lineHeight: 1.55 }}>
        O ajuste por módulo <b>restringe</b> o que o perfil já concede — nunca amplia. Quem trava de
        verdade é a RLS por perfil no banco, e a tela não promete acesso que o servidor negaria.
        Perfis de nível 90 ou mais têm acesso total e não recebem matriz.
      </p>

      {(editando || novo) && (
        <FichaUsuario
          usuario={editando}
          souEu={editando?.id === eu?.id}
          ultimoAdmin={editando ? ehUltimoAdmin(editando) : false}
          onFechar={() => { setEditando(null); setNovo(false) }}
          onSalvar={async (u) => {
            const msg = await salvarUsuario(u)
            if (msg) { toast(msg, true); return }
            setEditando(null); setNovo(false)
            toast(editando ? 'Acesso atualizado.' : 'Acesso concedido.')
          }}
        />
      )}
    </>
  )
}

/* ---------------- ficha ---------------- */

function FichaUsuario({ usuario, souEu, ultimoAdmin, onFechar, onSalvar }: {
  usuario: Usuario | null
  souEu?: boolean
  ultimoAdmin?: boolean
  onFechar: () => void
  onSalvar: (u: Usuario) => void | Promise<void>
}) {
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [perfil, setPerfil] = useState<Perfil>((usuario?.perfil ?? 'visualizador') as Perfil)
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true)
  const [senha, setSenha] = useState('')
  const [ajuste, setAjuste] = useState<Permissoes>(usuario?.permissoes ?? {})

  const teto = useMemo(() => tetoDoPerfil(perfil), [perfil])
  const total = acessoTotal(perfil)

  const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
  const senhaOk = usuario ? senha === '' : true
  const valido = nome.trim().length >= 3 && emailValido && senhaOk

  /* Trocar de perfil recarrega a matriz com o template do novo perfil: é o
     comportamento do Inovar — "o perfil preenche; ajuste se quiser". */
  function trocarPerfil(p: Perfil) {
    setPerfil(p)
    setAjuste(Object.fromEntries(
      MODULOS.map((m) => [m.id, { ...(tetoDoPerfil(p)[m.id] ?? { v: false, e: false }) }]),
    ))
  }

  function marcar(mod: string, campo: 'v' | 'e', valor: boolean) {
    setAjuste((a) => {
      const atual = a[mod] ?? { ...(teto[mod] ?? { v: false, e: false }) }
      const novo = { ...atual, [campo]: valor }
      // Editar sem ver não existe: marcar editar acende ver, apagar ver apaga editar.
      if (campo === 'e' && valor) novo.v = true
      if (campo === 'v' && !valor) novo.e = false
      return { ...a, [mod]: novo }
    })
  }

  return (
    <Modal titulo={usuario ? 'Editar usuário' : 'Novo usuário'} largura={560} onFechar={onFechar}>
      <Campo label="Nome completo">
        <input className="inp" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </Campo>

      <Campo label="E-mail"
        dica={usuario ? 'O e-mail identifica a conta no ecossistema e não é editável aqui.' : 'A pessoa precisa já ter conta — o cadastro público está desativado de propósito.'}>
        <input className="inp" type="email" value={email} disabled={!!usuario}
          onChange={(e) => setEmail(e.target.value)} />
      </Campo>

      <Campo label="Perfil de acesso"
        dica={souEu ? 'Você não pode rebaixar o próprio perfil — evita perder o acesso administrativo por engano.'
          : ultimoAdmin ? 'Este é o único administrador ativo. Promova outra pessoa antes de rebaixá-lo.'
            : `Nível ${PERFIS[perfil]?.nivel}. O nível define o teto do que a matriz abaixo pode liberar.`}>
        <select className="inp" value={perfil} disabled={souEu || ultimoAdmin}
          onChange={(e) => trocarPerfil(e.target.value as Perfil)}>
          {PERFIS_LISTA.map((p) => (
            <option key={p} value={p}>{PERFIS[p].label} · Nível {PERFIS[p].nivel}</option>
          ))}
        </select>
      </Campo>

      {total ? (
        <div className="faixa faixa-legal" style={{ marginBottom: 14 }}>
          <span>✓</span>{PERFIS[perfil].label} tem acesso total — não há matriz para ajustar.
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>
            Permissões por módulo{' '}
            <span style={{ fontWeight: 400, color: 'var(--tx3)' }}>(o perfil preenche; desmarque o que quiser tirar)</span>
          </div>
          <div className="tbl-wrap" style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            <table className="tbl" style={{ fontSize: 13 }}>
              <thead>
                <tr><th>Módulo</th><th style={{ textAlign: 'center', width: 62 }}>Ver</th><th style={{ textAlign: 'center', width: 62 }}>Editar</th></tr>
              </thead>
              <tbody>
                {MODULOS.map((m) => {
                  const t = teto[m.id] ?? { v: false, e: false }
                  const a = ajuste[m.id] ?? t
                  return (
                    <tr key={m.id} style={{ cursor: 'default' }}>
                      <td data-l="Módulo">
                        {m.nome}
                        {!t.v && <span style={{ fontSize: 11, color: 'var(--tx3)' }}> · fora do perfil</span>}
                      </td>
                      <td data-l="Ver" style={{ textAlign: 'center' }}>
                        <input type="checkbox" disabled={!t.v} checked={t.v && a.v !== false}
                          onChange={(e) => marcar(m.id, 'v', e.target.checked)} />
                      </td>
                      <td data-l="Editar" style={{ textAlign: 'center' }}>
                        <input type="checkbox" disabled={!t.e} checked={t.e && a.e !== false}
                          onChange={(e) => marcar(m.id, 'e', e.target.checked)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!usuario && (
        /* §18 dos padrões VIZIO — campo de senha com botão de olho.
           Aqui ele fica desativado de propósito: senha é a pessoa que define,
           pelo link de definição enviado por e-mail. Ninguém digita a senha
           de outro. */
        <Campo label="Senha"
          dica="Quem define a senha é a própria pessoa, pelo link enviado por e-mail. Nem o administrador nem o sistema veem essa senha.">
          <CampoSenha value={senha} disabled placeholder="definida pela própria pessoa"
            onChange={(e) => setSenha(e.target.value)} />
        </Campo>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, marginBottom: 4, cursor: souEu ? 'not-allowed' : 'pointer' }}>
        <input type="checkbox" checked={ativo} disabled={souEu || ultimoAdmin}
          onChange={(e) => setAtivo(e.target.checked)} />
        Acesso ativo
      </label>

      <Rodape>
        <button className="b-ghost" onClick={onFechar}>Cancelar</button>
        <button className="b" disabled={!valido}
          onClick={() => onSalvar({
            id: usuario?.id ?? `u${Date.now()}`,
            nome: nome.trim(), email: email.trim().toLowerCase(),
            perfil, ativo, ultimoAcesso: usuario?.ultimoAcesso,
            fotoUrl: usuario?.fotoUrl,
            permissoes: total ? null : ajuste,
          })}>Salvar</button>
      </Rodape>
    </Modal>
  )
}
