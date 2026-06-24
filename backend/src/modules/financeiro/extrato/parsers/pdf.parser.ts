import Anthropic from '@anthropic-ai/sdk'
import { AppError } from '../../../../shared/errors'

interface LancamentoRaw {
  data: Date
  descricao: string
  valor: number
  nsuRef?: string
}

const PROMPT = `Analise este extrato bancário e extraia todas as entradas de crédito (dinheiro recebido/depositado).
Retorne SOMENTE um JSON array com objetos no formato exato:
[{"data":"YYYY-MM-DD","descricao":"descrição da transação","valor":123.45}]

Regras:
- Inclua apenas créditos (recebimentos, depósitos, PIX recebidos, pagamentos recebidos)
- Ignore débitos, saques, tarifas, pagamentos feitos
- Data no formato ISO: YYYY-MM-DD
- Valor como número decimal com ponto (sem R$, sem vírgula como separador decimal)
- Retorne APENAS o JSON array, sem nenhum texto, explicação ou markdown`

export async function parsePdf(base64: string, mimeType: string): Promise<LancamentoRaw[]> {
  const client = new Anthropic()

  let response: Awaited<ReturnType<typeof client.messages.create>>

  if (mimeType === 'application/pdf') {
    // PDFs usam a API beta de documentos
    response = await (client.beta as any).messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      betas: ['pdfs-2024-09-25'],
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: PROMPT },
        ],
      }],
    })
  } else {
    // Imagens (jpeg, png, webp, gif)
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedMime.includes(mimeType)) {
      throw new AppError(`Tipo de arquivo não suportado: ${mimeType}`, 400)
    }
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
              data: base64,
            },
          },
          { type: 'text', text: PROMPT },
        ],
      }],
    })
  }

  const texto = response.content.find(b => b.type === 'text')?.text ?? ''

  // Extrai o JSON array da resposta (ignora qualquer texto ao redor)
  const jsonMatch = texto.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new AppError('IA não retornou transações reconhecíveis neste arquivo', 422)

  let itens: { data: string; descricao: string; valor: number }[]
  try {
    itens = JSON.parse(jsonMatch[0])
  } catch {
    throw new AppError('Resposta da IA em formato inesperado', 422)
  }

  return itens
    .filter(i => i.data && i.descricao && i.valor > 0)
    .map(i => ({
      data:      new Date(i.data),
      descricao: i.descricao.trim(),
      valor:     Number(i.valor),
    }))
}
