/* ============================================================
   Serviços de IA — Claude (Anthropic).
   DORMENTE por decisão do Isaac (16/08/2026): a interface existe,
   a ativação vem depois.

   Regras que valem quando for ligada (§36 do briefing):
   · a chave NUNCA vive no navegador — a chamada sai por Edge Function
     do Supabase, que lê ANTHROPIC_API_KEY do ambiente;
   · toda resposta registra modelo, data, versão do prompt, documento,
     confiança, fontes e status de revisão humana (tabela `ai_runs`);
   · sem chave configurada, NADA é simulado: a função devolve
     `{ ok:false, motivo:'nao_configurada' }` e a tela oferece
     preenchimento manual.
   ============================================================ */
import { IA, MODO_DEMO } from '../app.config'
import { sb } from './supabase'

export type TarefaIA =
  | 'extrair_campos' | 'classificar' | 'resumir' | 'identificar_riscos'
  | 'gerar_checklist' | 'sugerir_swot' | 'sugerir_pestel'
  | 'recomendar' | 'traduzir' | 'busca_semantica'

export interface RespostaIA<T = unknown> {
  ok: boolean
  motivo?: 'nao_configurada' | 'sem_backend' | 'erro'
  dados?: T
  meta?: {
    modelo: string
    versaoPrompt: string
    executadoEm: string
    confianca: number
    revisadoPorHumano: false
  }
}

export const iaDisponivel = () => IA.ativa && !MODO_DEMO && !!sb

export function estadoIA(): { ativa: boolean; texto: string } {
  if (MODO_DEMO) {
    return { ativa: false, texto: 'IA não configurada — backend ainda não provisionado. Os campos são preenchidos e revisados manualmente.' }
  }
  if (!IA.ativa) {
    return { ativa: false, texto: `IA não ativada. A integração com ${IA.modelo} está construída e desligada; ligar exige a chave no ambiente do Supabase.` }
  }
  return { ativa: true, texto: `IA ativa · ${IA.modelo}. Toda saída exige revisão humana antes de ser aprovada.` }
}

/** Ponto único de chamada. Enquanto dormente, nunca dispara rede. */
export async function chamarIA<T>(tarefa: TarefaIA, entrada: unknown): Promise<RespostaIA<T>> {
  if (!iaDisponivel()) return { ok: false, motivo: 'nao_configurada' }
  if (!sb) return { ok: false, motivo: 'sem_backend' }
  const { data, error } = await sb.functions.invoke(IA.endpoint, { body: { tarefa, entrada } })
  if (error) return { ok: false, motivo: 'erro' }
  return data as RespostaIA<T>
}
