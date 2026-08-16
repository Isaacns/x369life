import { Vazio } from '../ui/kit'

/* Módulo previsto e ainda não construído. O briefing proíbe simular
   funcionalidade futura como se já funcionasse — então a tela diz a
   verdade em vez de exibir botão sem ação. */
const PORQUE: Record<string, string> = {
  Produtos: 'Catálogo com fabricante, especificações, certificações e documentos técnicos.',
  Comparador: 'Comparação de 2 a 4 produtos com grupos de equivalência e custo total de propriedade.',
  'Mercados e países': 'Ficha por país com indicadores, barreiras, tributação e compradores.',
  Legislação: 'Biblioteca regulatória com vigência, aplicabilidade e data da última verificação.',
  Fontes: 'Catálogo de fontes com confiabilidade, data de acesso e rastreabilidade.',
  Organizações: 'Cadastro de fornecedores, compradores e organizações vinculadas.',
}

export default function EmBreve({ titulo }: { titulo: string }) {
  return (
    <Vazio ico="◷" titulo={`${titulo} — Lote 5`}
      texto={
        (PORQUE[titulo] ? PORQUE[titulo] + ' ' : '') +
        'Este módulo faz parte do lote posterior ao MVP e depende de conteúdo que ainda não existe. ' +
        'Preferimos deixar a tela honesta a exibir botões sem ação.'
      } />
  )
}
