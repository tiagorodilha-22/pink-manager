// Parsers CSV para relatórios de adquirentes
// Rede: portal meupostorede.com.br → Extrato de Vendas
// Stone: portal portal.stone.com.br → Relatório de Transações

interface LancamentoRaw {
  data: Date
  descricao: string
  valor: number
  nsuRef?: string
}

// Rede CSV — colunas esperadas (adaptável):
// Data Venda;NSU;Tipo;Parcela;Valor Bruto;Valor Liquido;Status
export async function parseRede(conteudo: string): Promise<LancamentoRaw[]> {
  const linhas = conteudo.split('\n').map(l => l.trim()).filter(Boolean)
  if (linhas.length < 2) return []

  const cabecalho = linhas[0].split(';').map(c => c.toLowerCase().trim())
  const idxData = encontrarColuna(cabecalho, ['data venda', 'data', 'dt venda'])
  const idxNSU = encontrarColuna(cabecalho, ['nsu', 'nsu rede', 'num autorizacao'])
  const idxValor = encontrarColuna(cabecalho, ['valor liquido', 'valor liq', 'vlr liquido', 'valor bruto'])
  const idxStatus = encontrarColuna(cabecalho, ['status', 'situacao'])

  const lancamentos: LancamentoRaw[] = []

  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(';').map(c => c.trim())

    const status = idxStatus >= 0 ? cols[idxStatus]?.toLowerCase() : ''
    if (status && !status.includes('aprovad') && !status.includes('pago') && !status.includes('liquid')) continue

    const dataStr = idxData >= 0 ? cols[idxData] : ''
    const nsu = idxNSU >= 0 ? cols[idxNSU] : undefined
    const valorStr = idxValor >= 0 ? cols[idxValor] : ''

    const data = parseDataBR(dataStr)
    const valor = parseValorBR(valorStr)

    if (!data || !valor || valor <= 0) continue

    lancamentos.push({
      data,
      descricao: `Rede${nsu ? ` NSU ${nsu}` : ''}`,
      valor,
      nsuRef: nsu,
    })
  }

  return lancamentos
}

// Stone CSV — colunas esperadas:
// Data de Criação;NSU;Tipo de Pagamento;Parcelas;Valor Bruto;Taxa;Valor Líquido;Status
export async function parseStone(conteudo: string): Promise<LancamentoRaw[]> {
  const linhas = conteudo.split('\n').map(l => l.trim()).filter(Boolean)
  if (linhas.length < 2) return []

  const separador = linhas[0].includes(';') ? ';' : ','
  const cabecalho = linhas[0].split(separador).map(c => c.toLowerCase().trim().replace(/"/g, ''))

  const idxData = encontrarColuna(cabecalho, ['data de criação', 'data criacao', 'data', 'created_at'])
  const idxNSU = encontrarColuna(cabecalho, ['nsu', 'stone_id', 'id transacao'])
  const idxValor = encontrarColuna(cabecalho, ['valor líquido', 'valor liquido', 'net_amount', 'valor liq'])
  const idxStatus = encontrarColuna(cabecalho, ['status', 'situacao'])

  const lancamentos: LancamentoRaw[] = []

  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(separador).map(c => c.trim().replace(/"/g, ''))

    const status = idxStatus >= 0 ? cols[idxStatus]?.toLowerCase() : ''
    if (status && !status.includes('aprovad') && !status.includes('pago') && !status.includes('paid')) continue

    const dataStr = idxData >= 0 ? cols[idxData] : ''
    const nsu = idxNSU >= 0 ? cols[idxNSU] : undefined
    const valorStr = idxValor >= 0 ? cols[idxValor] : ''

    const data = parseDataBR(dataStr) ?? parseDataISO(dataStr)
    const valor = parseValorBR(valorStr)

    if (!data || !valor || valor <= 0) continue

    lancamentos.push({
      data,
      descricao: `Stone${nsu ? ` NSU ${nsu}` : ''}`,
      valor,
      nsuRef: nsu,
    })
  }

  return lancamentos
}

// ─── Helpers ───────────────────────────────────────

function encontrarColuna(cabecalho: string[], candidatos: string[]): number {
  for (const c of candidatos) {
    const idx = cabecalho.findIndex(h => h.includes(c))
    if (idx >= 0) return idx
  }
  return -1
}

function parseDataBR(str: string): Date | null {
  // DD/MM/YYYY ou DD/MM/YYYY HH:MM
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return null
  return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
}

function parseDataISO(str: string): Date | null {
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function parseValorBR(str: string): number | null {
  if (!str) return null
  // Remove R$, espaços, pontos de milhar; substitui vírgula decimal
  const limpo = str.replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.')
  const valor = parseFloat(limpo)
  return isNaN(valor) ? null : valor
}
