import { useRef, useState } from 'react'
import { PERFIS, type Perfil } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { useDados } from '../lib/dados'
import { sb } from '../lib/supabase'
import { Campo, CampoSenha, Modal, Rodape, useToast } from '../ui/kit'
import { Retrato } from '../ui/Retrato'

/* ============================================================
   Ficha "Meu perfil" — padrão do Ateliê Manager.
   O que a pessoa muda sozinha: nome, foto e como quer ser tratada.
   O que só a administração muda: e-mail e perfil de acesso — por isso
   aparecem aqui em leitura, não escondidos. A senha nova é digitada por
   quem é dono dela e vai direto para o Supabase Auth.
   ============================================================ */

const TRATAMENTOS = [
  { id: 'feminino', label: 'Feminino — "Bem-vinda, Administradora"' },
  { id: 'masculino', label: 'Masculino — "Bem-vindo, Administrador"' },
  { id: 'neutro', label: 'Neutro — sem flexão' },
]

const LIMITE_MB = 3

/* Reduz a imagem antes de subir: 512px de lado maior, JPEG. Uma foto de
   celular tem 4 MB e 4000px — nada disso chega num avatar de 34px. */
async function reduzir(arquivo: File, lado = 512, qualidade = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
  const l = Math.round(bitmap.width * escala)
  const a = Math.round(bitmap.height * escala)
  const canvas = document.createElement('canvas')
  canvas.width = l; canvas.height = a
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, l, a)
  bitmap.close()
  return new Promise((ok, falhou) => {
    canvas.toBlob((b) => (b ? ok(b) : falhou(new Error('Não consegui processar a imagem.'))),
      'image/jpeg', qualidade)
  })
}

export default function MeuPerfil({ onFechar }: { onFechar: () => void }) {
  const { usuario, atualizarUsuario, definirSenha } = useAuth()
  const { orgId, recarregar } = useDados()
  const toast = useToast()

  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [tratamento, setTratamento] = useState(usuario?.tratamento ?? 'neutro')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string | null>(usuario?.fotoUrl ?? null)
  const [removerFoto, setRemoverFoto] = useState(false)
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const inputFoto = useRef<HTMLInputElement>(null)

  const perfil = (usuario?.perfil ?? 'visualizador') as Perfil

  function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) { toast('Escolha um arquivo de imagem.', true); return }
    if (f.size > LIMITE_MB * 1024 * 1024) { toast(`A foto precisa ter no máximo ${LIMITE_MB} MB.`, true); return }
    // Nada sobe agora: a prévia é local e o upload só acontece ao salvar.
    setArquivo(f); setPrevia(URL.createObjectURL(f)); setRemoverFoto(false)
  }

  async function salvar() {
    if (nome.trim().length < 2) { toast('Escreva seu nome.', true); return }
    if ((s1 || s2) && s1.length < 8) { toast('A senha nova precisa de ao menos 8 caracteres.', true); return }
    if ((s1 || s2) && s1 !== s2) { toast('As duas senhas não conferem.', true); return }
    if (!sb || !usuario) { toast('Backend não configurado.', true); return }

    setOcupado(true)
    try {
      let fotoUrl: string | null = removerFoto ? null : (usuario.fotoUrl ?? null)

      if (arquivo) {
        if (!orgId) throw new Error('Organização não carregada.')
        const blob = await reduzir(arquivo)
        // A policy do bucket exige a organização como primeira pasta.
        // Nome único por envio: nunca sobrescreve o arquivo anterior.
        const caminho = `${orgId}/${usuario.id}-${Date.now()}.jpg`
        const up = await sb.storage.from('x369-avatars')
          .upload(caminho, blob, { contentType: 'image/jpeg', upsert: false })
        if (up.error) throw up.error
        fotoUrl = sb.storage.from('x369-avatars').getPublicUrl(caminho).data.publicUrl
      }

      const { error } = await sb.schema('x369life').from('profiles')
        .update({ nome: nome.trim(), foto_url: fotoUrl, tratamento })
        .eq('id', usuario.id)
      if (error) throw error

      if (s1) {
        const msg = await definirSenha(s1)
        if (msg) throw new Error(msg)
      }

      atualizarUsuario({ nome: nome.trim(), fotoUrl: fotoUrl ?? undefined, tratamento })
      await recarregar()
      toast(s1 ? 'Perfil e senha atualizados.' : 'Perfil atualizado.')
      onFechar()
    } catch (e) {
      toast('Não consegui salvar: ' + ((e as { message?: string }).message ?? e), true)
    }
    setOcupado(false)
  }

  return (
    <Modal titulo="Meu perfil" largura={540} onFechar={onFechar}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
        <Retrato nome={nome} url={previa} tamanho={76} />
        <div>
          <button type="button" className="b-sm" onClick={() => inputFoto.current?.click()}>
            ◎ {previa ? 'Trocar foto' : 'Colocar foto'}
          </button>
          <input ref={inputFoto} type="file" accept="image/*" hidden onChange={escolherFoto} />
          {previa && (
            <button type="button" className="b-sm" style={{ border: 'none', background: 'none', color: 'var(--tx3)', textDecoration: 'underline' }}
              onClick={() => { setArquivo(null); setPrevia(null); setRemoverFoto(true) }}>
              remover
            </button>
          )}
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6 }}>
            JPG ou PNG, até {LIMITE_MB} MB.
          </div>
        </div>
      </div>

      <Campo label="Nome">
        <input className="inp" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
      </Campo>

      <div className="grade-2">
        <Campo label="Como prefere ser tratado(a)">
          <select className="inp" value={tratamento} onChange={(e) => setTratamento(e.target.value)}>
            {TRATAMENTOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Campo>
        <Campo label="Perfil de acesso">
          <input className="inp" value={PERFIS[perfil]?.label ?? perfil} disabled />
        </Campo>
      </div>

      <Campo label="E-mail">
        <input className="inp" value={usuario?.email ?? '—'} disabled />
      </Campo>
      <p style={{ fontSize: 11, color: 'var(--tx3)', margin: '-6px 0 0' }}>
        O e-mail e o perfil de acesso são definidos pela administração do sistema.
      </p>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span aria-hidden style={{ color: 'var(--tx3)' }}>⚿</span>
          <b style={{ fontSize: 13.5 }}>Trocar minha senha</b>
        </div>
        <div className="grade-2">
          <Campo label="Nova senha">
            <CampoSenha value={s1} autoComplete="new-password" minLength={8}
              placeholder="Mínimo 8 caracteres" onChange={(e) => setS1(e.target.value)} />
          </Campo>
          <Campo label="Repita a nova senha">
            <CampoSenha value={s2} autoComplete="new-password"
              onChange={(e) => setS2(e.target.value)} />
          </Campo>
        </div>
        <p style={{ fontSize: 11, color: 'var(--tx3)', margin: '-6px 0 0' }}>
          Deixe em branco para manter a senha atual.
        </p>
      </div>

      <Rodape>
        <button className="b-ghost" onClick={onFechar}>Cancelar</button>
        <button className="b" onClick={() => void salvar()} disabled={ocupado}>
          {ocupado ? 'Salvando…' : 'Salvar'}
        </button>
      </Rodape>
    </Modal>
  )
}
