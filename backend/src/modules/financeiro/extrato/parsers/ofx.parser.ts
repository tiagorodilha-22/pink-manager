// Parser OFX para extrato do Banco Inter
// O Inter exporta OFX padrão com STMTTRN entries

interface LancamentoRaw {
  data: Date
  descricao: string
  valor: number
  nsuRef?: string
}

export async function parseOfx(conteudo: string): Promise<LancamentoRaw[]> {
  const lancamentos: LancamentoRaw[] = []

  // Extrai blocos STMTTRN
  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) ?? []

  for (const bloco of blocos) {
    const dtPosted = extrairTag(bloco, 'DTPOSTED')
    const trnamt = extrairTag(bloco, 'TRNAMT')
    const memo = extrairTag(bloco, 'MEMO') ?? extrairTag(bloco, 'NAME') ?? ''

    if (!dtPosted || !trnamt) continue

    const valor = parseFloat(trnamt.replace(',', '.'))
    if (valor <= 0) continue // só entradas (créditos)

    // Formato OFX: YYYYMMDD ou YYYYMMDDHHMMSS
    const dataStr = dtPosted.substring(0, 8)
    const data = new Date(
      parseInt(dataStr.substring(0, 4)),
      parseInt(dataStr.substring(4, 6)) - 1,
      parseInt(dataStr.substring(6, 8)),
    )

    // Tenta extrair NSU do memo (PIX costuma trazer o ID no memo)
    const nsuMatch = memo.match(/NSU[:\s]*(\d{6,})/i)

    lancamentos.push({
      data,
      descricao: memo.trim(),
      valor,
      nsuRef: nsuMatch?.[1],
    })
  }

  return lancamentos
}

function extrairTag(texto: string, tag: string): string | undefined {
  const match = texto.match(new RegExp(`<${tag}>([^<]+)`, 'i'))
  return match?.[1]?.trim()
}
