import { useState, type FormEvent } from 'react'
import { APP } from '../app.config'
import { useAuth } from '../auth/AuthContext'
import { PAISES } from '../lib/demo'
import { sb } from '../lib/supabase'
import { Campo } from '../ui/kit'
import { Marca } from '../ui/Marca'

/* Primeiro acesso: a organização não existe ainda. A RPC criar_organizacao
   cria organização + vínculo owner + perfil comercial + versão 1 dos pesos
   numa transação só — nunca em quatro chamadas soltas. */
export default function Onboarding({ onPronto }: { onPronto: () => void }) {
  const { usuario, sair } = useAuth()
  const [nome, setNome] = useState('')
  const [pais, setPais] = useState('br')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!sb) { setErro('Backend não configurado.'); return }
    setErro(null); setOcupado(true)
    const { error } = await sb.schema('x369life').rpc('criar_organizacao', {
      p_nome: nome.trim(), p_pais: pais,
    })
    setOcupado(false)
    if (error) { setErro(error.message); return }
    onPronto()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div className="card" style={{ padding: '32px 28px' }}>
          <Marca tamanho={34} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '20px 0 5px' }}>
            Vamos cadastrar sua organização
          </h1>
          <p style={{ color: 'var(--tx2)', fontSize: 13.5, margin: '0 0 22px', lineHeight: 1.55 }}>
            É o perfil dela que o sistema compara com cada edital para calcular aderência.
            Você refina os demais dados depois, em Configurações.
          </p>

          {erro && (
            <div role="alert" style={{ border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, marginBottom: 14 }}>
              {erro}
            </div>
          )}

          <form onSubmit={criar}>
            <Campo label="Nome da organização">
              <input className="inp" required autoFocus value={nome}
                onChange={(ev) => setNome(ev.target.value)}
                placeholder="Razão social ou nome comercial" />
            </Campo>
            <Campo label="País de origem">
              <select className="inp" value={pais} onChange={(ev) => setPais(ev.target.value)}>
                {PAISES.map((p) => <option key={p.id} value={p.id}>{p.bandeira} {p.nome}</option>)}
              </select>
            </Campo>
            <button className="b b-full" type="submit" disabled={ocupado || nome.trim().length < 2}>
              {ocupado ? 'Criando…' : 'Criar organização'}
            </button>
          </form>

          <p style={{ marginTop: 16, fontSize: 12.5, textAlign: 'center', color: 'var(--tx2)' }}>
            Entrou como {usuario?.email} ·{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); void sair() }}>Sair</a>
          </p>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--tx3)', marginTop: 14, fontFamily: 'var(--mono)' }}>
          {APP.nome} v{APP.versao}
        </p>
      </div>
    </div>
  )
}
