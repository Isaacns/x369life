/* Client Supabase. Só é criado quando as variáveis existem — sem elas o app
   roda em modo demonstrativo e nada de rede é disparado (§36 do briefing:
   não simular chamada externa como se fosse real). */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { MODO_DEMO, SUPABASE_ANON, SUPABASE_URL } from '../app.config'

export const sb: SupabaseClient | null = MODO_DEMO
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    })

export interface Organizacao {
  id: string
  nome: string
  slug: string
  status: string
  pais_origem: string | null
}
