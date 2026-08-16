import { useState } from 'react'
import { MODO_DEMO, PERFIS, PERFIS_LISTA, podeAdministrar, type Perfil } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { useDados } from '../lib/dados'
import { dataHora, iniciais } from '../lib/formato'
import type { Usuario } from '../lib/tipos'
import { Badge, Campo, CampoSenha, FaixaDemo, Modal, Rodape, useToast, Vazio } from '../ui/kit'

/* Matriz de permissões por módulo (§8 dos padrões VIZIO). No go-live, estas
   linhas espelham as policies de RLS no banco — a tela mostra, o banco trava. */
const MATRIZ: { modulo: string; ver: Perfil[]; editar: Perfil[] }[] = [
  { modulo: 'Oportunidades e editais', ver: ['owner', 'admin', 'comercial', 'tecnico', 'juridico', 'fornecedor', 'visualizador'], editar: ['owner', 'admin', 'comercial'] },
  { modulo: 'Análise técnica e produtos', ver: ['owner', 'admin', 'comercial', 'tecnico', 'fornecedor'], editar: ['owner', 'admin', 'tecnico'] },
  { modulo: 'Riscos e pareceres jurídicos', ver: ['owner', 'admin', 'comercial', 'juridico'], editar: ['owner', 'admin', 'juridico'] },
  { modulo: 'Pipeline e decisões', ver: ['owner', 'admin', 'comercial', 'visualizador'], editar: ['owner', 'admin', 'comercial'] },
  { modulo: 'Relatórios', ver: ['owner', 'admin', 'comercial', 'tecnico', 'juridico', 'visualizador'], editar: ['owner', 'admin', 'comercial'] },
  { modulo: 'Usuários e configurações', ver: ['owner', 'admin'], editar: ['owner', 'admin'] },
]

export default function Usuarios() {
  const { usuarios, salvarUsuario, removerUsuario } = useDados()
  const { usuario: eu } = useAuth()
  const toast = useToast()
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [novo, setNovo] = useState(false)

  const admin = podeAdministrar((eu?.perfil ?? null) as Perfil | null)

  return (
    <>
      {MODO_DEMO && <FaixaDemo />}

      <div className="pg-h" style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>Usuários e perfis</h1>
          <p>Quem acessa, com qual permissão. O perfil define o que a pessoa vê e pode alterar.</p>
        </div>
        {admin && (
          <button className="b nao-imprime" onClick={() => { setEditando(null); setNovo(true) }}>
            + Novo usuário
          </button>
        )}
      </div>

      {!admin && (
        <div className="faixa faixa-legal">
          <span>⛔</span>Seu perfil ({PERFIS[(eu?.perfil ?? 'visualizador') as Perfil].label}) permite consultar a equipe, mas não alterar. Fale com um administrador.
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        {usuarios.length === 0 ? (
          <Vazio titulo="Nenhum usuário" texto="Cadastre o primeiro usuário da organização." />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th style={{ width: 46 }}></th><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th>Último acesso</th><th></th></tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} onClick={() => admin && setEditando(u)} style={{ cursor: admin ? 'pointer' : 'default' }}>
                    <td data-l="">
                      <span className="av" style={{ width: 32, height: 32, display: 'inline-flex', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11.5, fontWeight: 700, background: 'linear-gradient(140deg, var(--brand), var(--navy))' }}>
                        {iniciais(u.nome)}
                      </span>
                    </td>
                    <td data-l="Nome">
                      <b style={{ fontWeight: 600 }}>{u.nome}</b>
                      {u.id === eu?.id && <span style={{ fontSize: 11, color: 'var(--tx3)' }}> · você</span>}
                    </td>
                    <td data-l="E-mail" style={{ color: 'var(--tx2)' }}>{u.email}</td>
                    <td data-l="Perfil">{PERFIS[u.perfil as Perfil]?.label ?? u.perfil}</td>
                    <td data-l="Situação">
                      {u.ativo ? <Badge cor="var(--teal)">ativo</Badge> : <Badge cor="var(--tx3)">inativo</Badge>}
                    </td>
                    <td data-l="Último acesso" style={{ fontSize: 12, color: 'var(--tx2)' }}>
                      {u.ultimoAcesso ? dataHora(u.ultimoAcesso) : 'nunca acessou'}
                    </td>
                    <td className="td-acao" onClick={(e) => e.stopPropagation()}>
                      {admin && (
                        <button className="b-sm" onClick={() => setEditando(u)}>Editar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card card-p">
        <div className="sec-h">
          <h2>Permissões por perfil</h2>
          <span className="sub">◉ ver · ✎ editar</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Módulo</th>
                {PERFIS_LISTA.map((p) => <th key={p} style={{ textAlign: 'center' }}>{PERFIS[p].label}</th>)}
              </tr>
            </thead>
            <tbody>
              {MATRIZ.map((m) => (
                <tr key={m.modulo} style={{ cursor: 'default' }}>
                  <td data-l="Módulo"><b style={{ fontWeight: 500 }}>{m.modulo}</b></td>
                  {PERFIS_LISTA.map((p) => (
                    <td key={p} data-l={PERFIS[p].label} style={{ textAlign: 'center' }}>
                      {m.editar.includes(p) ? <span title="Ver e editar" style={{ color: 'var(--teal)' }}>✎</span>
                        : m.ver.includes(p) ? <span title="Somente ver" style={{ color: 'var(--tx2)' }}>◉</span>
                          : <span style={{ color: 'var(--line2)' }}>–</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--tx3)', margin: '12px 0 0', lineHeight: 1.5 }}>
          O perfil <b>Proprietário</b> é protegido e mantém acesso total. Quando o backend for provisionado,
          esta matriz passa a espelhar as policies de RLS do banco — a tela informa, o banco impede.
        </p>
      </div>

      {(editando || novo) && (
        <FichaUsuario
          usuario={editando}
          souEu={editando?.id === eu?.id}
          onFechar={() => { setEditando(null); setNovo(false) }}
          onSalvar={async (u) => {
            const msg = await salvarUsuario(u)
            if (msg) { toast(msg, true); return }
            setEditando(null); setNovo(false)
            toast(editando ? 'Acesso atualizado.' : 'Acesso concedido.')
          }}
          onRemover={editando ? async () => {
            await removerUsuario(editando.id)
            setEditando(null)
            toast('Acesso desativado.')
          } : undefined}
        />
      )}
    </>
  )
}

function FichaUsuario({ usuario, souEu, onFechar, onSalvar, onRemover }: {
  usuario: Usuario | null; souEu?: boolean
  onFechar: () => void
  onSalvar: (u: Usuario) => void | Promise<void>
  onRemover?: () => void | Promise<void>
}) {
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [perfil, setPerfil] = useState<string>(usuario?.perfil ?? 'visualizador')
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true)
  const [senha, setSenha] = useState('')

  const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
  const senhaOk = usuario ? (senha === '' || senha.length >= 8) : senha.length >= 8
  const valido = nome.trim().length >= 3 && emailValido && senhaOk

  return (
    <Modal titulo={usuario ? 'Editar usuário' : 'Novo usuário'} onFechar={onFechar}>
      <Campo label="Nome completo">
        <input className="inp" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </Campo>
      <Campo label="E-mail">
        <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Campo>
      <Campo label="Perfil de acesso"
        dica={souEu ? 'Você não pode rebaixar o próprio perfil — evita perder o acesso administrativo por engano.' : undefined}>
        <select className="inp" value={perfil} disabled={souEu} onChange={(e) => setPerfil(e.target.value)}>
          {PERFIS_LISTA.map((p) => <option key={p} value={p}>{PERFIS[p].label}</option>)}
        </select>
      </Campo>

      {/* §18 dos padrões VIZIO — campo de senha com botão de olho, em todo formulário */}
      <Campo label={usuario ? 'Nova senha (opcional)' : 'Senha inicial'}
        dica={usuario ? 'Deixe em branco para manter a senha atual. Mínimo de 8 caracteres.' : 'Mínimo de 8 caracteres. A pessoa poderá trocá-la depois.'}>
        <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password" placeholder={usuario ? '••••••••' : ''} />
      </Campo>

      <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, marginBottom: 4, cursor: souEu ? 'not-allowed' : 'pointer' }}>
        <input type="checkbox" checked={ativo} disabled={souEu} onChange={(e) => setAtivo(e.target.checked)} />
        Acesso ativo
      </label>

      <Rodape>
        {onRemover && !souEu && (
          <button className="b-ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginRight: 'auto' }}
            onClick={onRemover}>Remover acesso</button>
        )}
        <button className="b-ghost" onClick={onFechar}>Cancelar</button>
        <button className="b" disabled={!valido}
          onClick={() => onSalvar({
            id: usuario?.id ?? `u${Date.now()}`,
            nome: nome.trim(), email: email.trim().toLowerCase(),
            perfil, ativo, ultimoAcesso: usuario?.ultimoAcesso,
          })}>Salvar</button>
      </Rodape>
    </Modal>
  )
}
