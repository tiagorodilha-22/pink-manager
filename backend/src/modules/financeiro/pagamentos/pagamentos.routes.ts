import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import dayjs from 'dayjs'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { AppError, NotFoundError } from '../../../shared/errors'

const pagamentoSchema = z.object({
  osId: z.string().uuid(),
  metodo: z.enum(['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'TRANSFERENCIA']),
  adquirente: z.enum(['REDE', 'STONE', 'CIELO', 'PAGSEGURO', 'OUTROS']).optional(),
  nsu: z.string().optional(),
  valor: z.number().positive(),
  qtdParcelas: z.number().int().min(1).max(12).default(1),
})

function calcularDatasParcelas(dataBase: Date, qtd: number, valor: number) {
  return Array.from({ length: qtd }, (_, i) => ({
    numero: i + 1,
    valor: Number((valor / qtd).toFixed(2)),
    dataPrevista: dayjs(dataBase).add((i + 1) * 30, 'day').toDate(),
  }))
}

export default async function pagamentosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Registrar pagamento na OS
  app.post('/', async (req, reply) => {
    const data = pagamentoSchema.parse(req.body)

    const os = await prisma.ordemServico.findUnique({ where: { id: data.osId } })
    if (!os) throw new NotFoundError('OS')

    // Cartão exige adquirente
    if (['CARTAO_CREDITO', 'CARTAO_DEBITO'].includes(data.metodo) && !data.adquirente) {
      throw new AppError('Informe a adquirente para pagamento em cartão')
    }

    // Dinheiro vai para o caixa automaticamente
    const pagamento = await prisma.$transaction(async (tx) => {
      const pag = await tx.pagamento.create({
        data: {
          osId: data.osId,
          metodo: data.metodo,
          adquirente: data.adquirente,
          nsu: data.nsu,
          valor: data.valor,
          qtdParcelas: data.qtdParcelas,
          statusConcil: data.metodo === 'DINHEIRO' ? 'CONCILIADO' : 'PENDENTE',
        },
      })

      // Criar parcelas a receber para cartão de crédito
      if (data.metodo === 'CARTAO_CREDITO' && data.qtdParcelas > 1) {
        const parcelas = calcularDatasParcelas(new Date(), data.qtdParcelas, data.valor)
        await tx.parcelaReceber.createMany({
          data: parcelas.map(p => ({ ...p, pagamentoId: pag.id })),
        })
      } else if (data.metodo !== 'DINHEIRO') {
        // Pagamento único (PIX, débito, crédito 1x, transferência)
        await tx.parcelaReceber.create({
          data: {
            pagamentoId: pag.id,
            numero: 1,
            valor: data.valor,
            dataPrevista: data.metodo === 'CARTAO_CREDITO'
              ? dayjs().add(30, 'day').toDate()
              : new Date(),
          },
        })
      }

      // Lançamento no caixa para dinheiro
      if (data.metodo === 'DINHEIRO') {
        await tx.lancamentoCaixa.create({
          data: {
            tipo: 'ENTRADA',
            valor: data.valor,
            descricao: `Recebimento OS #${os.numero}`,
            osId: data.osId,
          },
        })
      }

      // Atualizar valor pago na OS
      const totalPago = await tx.pagamento.aggregate({
        where: { osId: data.osId },
        _sum: { valor: true },
      })
      await tx.ordemServico.update({
        where: { id: data.osId },
        data: { valorPago: totalPago._sum.valor ?? 0 },
      })

      return pag
    })

    return reply.status(201).send(pagamento)
  })

  // Buscar pagamentos de uma OS
  app.get('/os/:osId', async (req) => {
    const { osId } = req.params as { osId: string }
    return prisma.pagamento.findMany({
      where: { osId },
      include: { parcelas: true, conciliacoes: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  // Atualizar NSU depois (caso não foi informado na hora)
  app.patch('/:id/nsu', async (req) => {
    const { id } = req.params as { id: string }
    const { nsu } = z.object({ nsu: z.string().min(1) }).parse(req.body)
    return prisma.pagamento.update({ where: { id }, data: { nsu } })
  })

  // Recebíveis futuros (cartão parcelado a receber)
  app.get('/recebiveis', async (req) => {
    const { ate } = req.query as { ate?: string }
    return prisma.parcelaReceber.findMany({
      where: {
        conciliado: false,
        dataPrevista: ate ? { lte: new Date(ate) } : undefined,
      },
      include: {
        pagamento: {
          include: {
            os: { select: { numero: true, veiculo: { include: { cliente: { select: { nome: true } } } } } },
          },
        },
      },
      orderBy: { dataPrevista: 'asc' },
    })
  })
}
