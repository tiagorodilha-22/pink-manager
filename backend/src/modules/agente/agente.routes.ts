import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { authenticate } from '../../shared/auth.middleware'
import { AppError } from '../../shared/errors'

const CATEGORIAS = ['FREIOS','MOTOR','SUSPENSAO','ELETRICA','FILTROS','PNEUS','TRANSMISSAO','CARROCERIA','FLUIDOS','OUTROS']

export default async function agenteRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.post('/pesquisar-peca', async (req) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new AppError('ANTHROPIC_API_KEY não configurada. Adicione no arquivo .env do backend.', 503)
    }

    const { marca, modelo, ano, query } = z.object({
      marca:  z.string().min(1),
      modelo: z.string().min(1),
      ano:    z.string().min(4),
      query:  z.string().optional(),
    }).parse(req.body)

    const anthropic = new Anthropic({ apiKey })

    const prompt = query
      ? `Veículo: ${marca} ${modelo} ${ano}. Peça: "${query}"`
      : `Veículo: ${marca} ${modelo} ${ano}. Quais são as principais peças de desgaste e manutenção comuns?`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `Você é um especialista em peças automotivas no mercado brasileiro.
Quando receber informações de um veículo e uma peça/query, retorne dados precisos sobre a peça.
Foque em: código OEM/fabricante, compatibilidade exata do veículo, marcas confiáveis disponíveis no Brasil (Bosch, Mahle, TRW, Gates, Dayco, NGK, Denso, Monroe, Cofap, etc.) e faixa de preço realista no mercado brasileiro atual.
Seja direto e preciso. Se não souber o código OEM exato, não invente — informe que é necessário consultar o catálogo oficial.`,
      tools: [{
        name: 'retornar_peca',
        description: 'Retorna as informações estruturadas da peça automotiva pesquisada',
        input_schema: {
          type: 'object' as const,
          properties: {
            nome:             { type: 'string', description: 'Nome completo da peça' },
            codigoFabricante: { type: 'string', description: 'Código OEM do fabricante. Null se não souber com certeza.' },
            codigosAlternativos: {
              type: 'array',
              items: { type: 'string' },
              description: 'Códigos aftermarket alternativos (ex: Bosch BP1234)'
            },
            categoria: {
              type: 'string',
              enum: CATEGORIAS,
              description: 'Categoria da peça'
            },
            marcas: {
              type: 'array',
              items: { type: 'string' },
              description: 'Marcas confiáveis disponíveis no Brasil'
            },
            compatibilidade:  { type: 'string', description: 'Veículos compatíveis além do solicitado' },
            faixaPrecoMin:    { type: 'number', description: 'Preço mínimo em R$ no mercado BR' },
            faixaPrecoMax:    { type: 'number', description: 'Preço máximo em R$ no mercado BR' },
            descricao:        { type: 'string', description: 'Descrição técnica resumida' },
            observacoes:      { type: 'string', description: 'Observações importantes (ex: vem em par, requer programação, etc.)' },
          },
          required: ['nome', 'categoria', 'marcas'],
        },
      }],
      tool_choice: { type: 'tool', name: 'retornar_peca' },
      messages: [{ role: 'user', content: prompt }],
    })

    const toolUse = response.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new AppError('Agente não retornou resultado estruturado')
    }

    return toolUse.input
  })
}
