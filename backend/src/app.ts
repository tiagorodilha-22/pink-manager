import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { AppError } from './shared/errors'

// Routes
import authRoutes from './modules/auth/auth.routes'
import clientesRoutes from './modules/recepcao/clientes/clientes.routes'
import veiculosRoutes from './modules/recepcao/veiculos/veiculos.routes'
import agendamentosRoutes from './modules/recepcao/agendamentos/agendamentos.routes'
import osRoutes from './modules/os/os.routes'
import pagamentosRoutes from './modules/financeiro/pagamentos/pagamentos.routes'
import extratoRoutes from './modules/financeiro/extrato/extrato.routes'
import conciliacaoRoutes from './modules/financeiro/conciliacao/conciliacao.routes'
import caixaRoutes from './modules/financeiro/caixa/caixa.routes'

const app = Fastify({ logger: true })

app.register(cors, { origin: true })

app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'dev_secret_change_in_prod',
})

// Error handler
app.setErrorHandler((error, _req, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message })
  }
  app.log.error(error)
  return reply.status(500).send({ error: 'Erro interno do servidor' })
})

// Routes
app.register(authRoutes, { prefix: '/auth' })
app.register(clientesRoutes, { prefix: '/clientes' })
app.register(veiculosRoutes, { prefix: '/veiculos' })
app.register(agendamentosRoutes, { prefix: '/agendamentos' })
app.register(osRoutes, { prefix: '/os' })
app.register(pagamentosRoutes, { prefix: '/pagamentos' })
app.register(extratoRoutes, { prefix: '/extrato' })
app.register(conciliacaoRoutes, { prefix: '/conciliacao' })
app.register(caixaRoutes, { prefix: '/caixa' })

app.get('/health', async () => ({ status: 'ok', app: 'Pink Manager' }))

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
