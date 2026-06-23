import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { ZodError } from 'zod'
import { AppError } from './shared/errors'

// Routes
import authRoutes from './modules/auth/auth.routes'
import clientesRoutes from './modules/recepcao/clientes/clientes.routes'
import veiculosRoutes from './modules/recepcao/veiculos/veiculos.routes'
import agendamentosRoutes from './modules/recepcao/agendamentos/agendamentos.routes'
import fornecedoresRoutes from './modules/recepcao/fornecedores/fornecedores.routes'
import nfRoutes from './modules/recepcao/notas-fiscais/nf.routes'
import usuariosRoutes from './modules/admin/usuarios/usuarios.routes'
import osRoutes from './modules/os/os.routes'
import pdfRoutes from './modules/os/pdf.routes'
import pagamentosRoutes from './modules/financeiro/pagamentos/pagamentos.routes'
import extratoRoutes from './modules/financeiro/extrato/extrato.routes'
import conciliacaoRoutes from './modules/financeiro/conciliacao/conciliacao.routes'
import caixaRoutes from './modules/financeiro/caixa/caixa.routes'
import contasPagarRoutes from './modules/financeiro/contas-pagar/contas-pagar.routes'
import dashboardRoutes from './modules/dashboard/dashboard.routes'
import relatoriosRoutes from './modules/financeiro/relatorios/relatorios.routes'
import inventarioRoutes from './modules/financeiro/inventario/inventario.routes'
import agenteRoutes from './modules/agente/agente.routes'
import avaliacoesRoutes from './modules/avaliacoes/avaliacoes.routes'
import manutencaoRoutes from './modules/recepcao/manutencao/manutencao.routes'
import portalRoutes from './modules/portal/portal.routes'
import agendamentoPublicoRoutes from './modules/recepcao/agendamentos/agendamento-publico.routes'
import servicosRoutes from './modules/recepcao/servicos/servicos.routes'
import filiaisRoutes  from './modules/admin/filiais/filiais.routes'
import tecnicosRoutes from './modules/admin/tecnicos/tecnicos.routes'

const app = Fastify({ logger: true })

app.register(cors, { origin: true })
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }) // 10 MB

app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'dev_secret_change_in_prod',
})

// Error handler
app.setErrorHandler((error, _req, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message })
  }
  if (error instanceof ZodError) {
    const msgs = error.errors.map(e => {
      const campo = e.path.join('.')
      const label: Record<string, string> = {
        nome: 'Nome', telefone: 'Telefone', email: 'E-mail',
        placa: 'Placa', marca: 'Marca', modelo: 'Modelo', ano: 'Ano',
        clienteId: 'Cliente', veiculoId: 'Veículo',
      }
      return `${label[campo] ?? campo}: ${e.message}`
    })
    return reply.status(400).send({ error: msgs.join(' · ') })
  }
  app.log.error(error)
  return reply.status(500).send({ error: 'Erro interno do servidor' })
})

// Routes
app.register(authRoutes, { prefix: '/auth' })
app.register(clientesRoutes, { prefix: '/clientes' })
app.register(veiculosRoutes, { prefix: '/veiculos' })
app.register(agendamentosRoutes, { prefix: '/agendamentos' })
app.register(fornecedoresRoutes, { prefix: '/fornecedores' })
app.register(nfRoutes,          { prefix: '/notas-fiscais' })
app.register(usuariosRoutes, { prefix: '/usuarios' })
app.register(osRoutes,  { prefix: '/os' })
app.register(pdfRoutes, { prefix: '/os' })
app.register(pagamentosRoutes, { prefix: '/pagamentos' })
app.register(extratoRoutes, { prefix: '/extrato' })
app.register(conciliacaoRoutes, { prefix: '/conciliacao' })
app.register(caixaRoutes, { prefix: '/caixa' })
app.register(contasPagarRoutes, { prefix: '/contas-pagar' })
app.register(dashboardRoutes,   { prefix: '/dashboard' })
app.register(relatoriosRoutes,  { prefix: '/relatorios' })
app.register(inventarioRoutes, { prefix: '/inventario' })
app.register(agenteRoutes,     { prefix: '/agente' })
app.register(avaliacoesRoutes,         { prefix: '/avaliacoes' })
app.register(manutencaoRoutes,         { prefix: '/manutencao' })
app.register(portalRoutes,             { prefix: '/portal' })
app.register(agendamentoPublicoRoutes, { prefix: '/publico' })
app.register(servicosRoutes,           { prefix: '/servicos' })
app.register(filiaisRoutes,            { prefix: '/filiais' })
app.register(tecnicosRoutes,           { prefix: '/tecnicos' })

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
