import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Usuários
  const senhaHash = await bcrypt.hash('pink123', 10)
  const [admin, recepcao, tecnico, financeiro] = await Promise.all([
    prisma.usuario.upsert({
      where: { email: 'admin@pink.com' },
      update: {},
      create: { nome: 'Administrador', email: 'admin@pink.com', senha: senhaHash, perfil: 'ADMIN' },
    }),
    prisma.usuario.upsert({
      where: { email: 'recepcao@pink.com' },
      update: {},
      create: { nome: 'Recepção', email: 'recepcao@pink.com', senha: senhaHash, perfil: 'RECEPCAO' },
    }),
    prisma.usuario.upsert({
      where: { email: 'tecnico@pink.com' },
      update: {},
      create: { nome: 'Técnico Silva', email: 'tecnico@pink.com', senha: senhaHash, perfil: 'TECNICO' },
    }),
    prisma.usuario.upsert({
      where: { email: 'financeiro@pink.com' },
      update: {},
      create: { nome: 'Financeiro', email: 'financeiro@pink.com', senha: senhaHash, perfil: 'FINANCEIRO' },
    }),
  ])
  console.log('✓ Usuários criados:', admin.email, recepcao.email, tecnico.email, financeiro.email)

  // Fornecedores
  const fornecedores = await Promise.all([
    prisma.fornecedor.upsert({
      where: { id: 'f1000000-0000-0000-0000-000000000001' },
      update: {},
      create: { id: 'f1000000-0000-0000-0000-000000000001', nome: 'AutoPeças Central', telefone: '(11) 99999-1111', email: 'vendas@autopecas.com' },
    }),
    prisma.fornecedor.upsert({
      where: { id: 'f1000000-0000-0000-0000-000000000002' },
      update: {},
      create: { id: 'f1000000-0000-0000-0000-000000000002', nome: 'Distribuidora Rápida', telefone: '(11) 99999-2222' },
    }),
  ])
  console.log('✓ Fornecedores criados:', fornecedores.map(f => f.nome).join(', '))

  // Clientes e veículos
  const joao = await prisma.cliente.upsert({
    where: { cpfCnpj: '123.456.789-00' },
    update: {},
    create: { nome: 'João Silva', cpfCnpj: '123.456.789-00', telefone: '(11) 98765-4321', email: 'joao@email.com' },
  })
  const maria = await prisma.cliente.upsert({
    where: { cpfCnpj: '987.654.321-00' },
    update: {},
    create: { nome: 'Maria Souza', cpfCnpj: '987.654.321-00', telefone: '(11) 91234-5678' },
  })
  const pedro = await prisma.cliente.upsert({
    where: { cpfCnpj: '111.222.333-44' },
    update: {},
    create: { nome: 'Pedro Oliveira', cpfCnpj: '111.222.333-44', telefone: '(11) 94567-8901', email: 'pedro@email.com' },
  })
  console.log('✓ Clientes criados:', joao.nome, maria.nome, pedro.nome)

  const civicJoao = await prisma.veiculo.upsert({
    where: { placa: 'ABC1D23' },
    update: {},
    create: { clienteId: joao.id, placa: 'ABC1D23', marca: 'Honda', modelo: 'Civic', ano: 2022, cor: 'Prata', km: 38500 },
  })
  const corollaMaria = await prisma.veiculo.upsert({
    where: { placa: 'DEF4G56' },
    update: {},
    create: { clienteId: maria.id, placa: 'DEF4G56', marca: 'Toyota', modelo: 'Corolla', ano: 2020, cor: 'Branco', km: 62000 },
  })
  const hb20Pedro = await prisma.veiculo.upsert({
    where: { placa: 'GHI7J89' },
    update: {},
    create: { clienteId: pedro.id, placa: 'GHI7J89', marca: 'Hyundai', modelo: 'HB20', ano: 2021, cor: 'Preto', km: 28000 },
  })
  console.log('✓ Veículos criados:', civicJoao.placa, corollaMaria.placa, hb20Pedro.placa)

  // OS de exemplo
  const os1 = await prisma.ordemServico.create({
    data: {
      numero: 1,
      veiculoId: civicJoao.id,
      queixa: 'Veículo com barulho ao frear e vibração no volante em alta velocidade.',
      status: 'AGUARDANDO_APROVACAO',
      historico: {
        create: [
          { statusDepois: 'RECEPCAO' },
          { statusAntes: 'RECEPCAO', statusDepois: 'DIAGNOSTICO' },
          { statusAntes: 'DIAGNOSTICO', statusDepois: 'AGUARDANDO_APROVACAO' },
        ],
      },
      checklist: {
        create: [
          { campo: 'Para-choque dianteiro', valor: true },
          { campo: 'Para-choque traseiro', valor: true },
          { campo: 'Faróis', valor: true },
          { campo: 'Rodas e pneus', valor: false, obs: 'Pneu traseiro direito com desgaste irregular' },
          { campo: 'Lataria', valor: true },
          { campo: 'Interior / estofamento', valor: true },
        ],
      },
      diagnostico: {
        create: {
          descricao: 'Pastilhas de freio dianteiras desgastadas (abaixo do mínimo). Disco de freio dianteiro direito com sulco. Balanceamento e alinhamento necessários.',
          tecnicoNome: 'Técnico Silva',
        },
      },
    },
  })

  // Orçamento para OS1
  await prisma.orcamento.create({
    data: {
      osId: os1.id,
      status: 'ENVIADO',
      valorPecas: 420,
      valorMO: 180,
      valorTotal: 600,
      prazoEntrega: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      itens: {
        create: [
          { tipo: 'PECA', descricao: 'Jogo pastilha freio dianteiro Honda Civic', quantidade: 1, valorUnit: 180, valorTotal: 180, fornecedorId: fornecedores[0].id },
          { tipo: 'PECA', descricao: 'Disco freio dianteiro direito', quantidade: 1, valorUnit: 240, valorTotal: 240, fornecedorId: fornecedores[0].id },
          { tipo: 'MAO_OBRA', descricao: 'Troca pastilha e disco + balanceamento 4 rodas', quantidade: 1, valorUnit: 180, valorTotal: 180 },
        ],
      },
    },
  })
  await prisma.ordemServico.update({ where: { id: os1.id }, data: { valorTotal: 600 } })
  console.log('✓ OS #1 criada (Aguardando Aprovação):', os1.numero)

  // OS em manutenção (com pagamento parcial)
  const os2 = await prisma.ordemServico.create({
    data: {
      numero: 2,
      veiculoId: corollaMaria.id,
      queixa: 'Troca de óleo e filtros + verificação geral.',
      status: 'EM_MANUTENCAO',
      valorTotal: 450,
      valorPago: 450,
      historico: {
        create: [
          { statusDepois: 'RECEPCAO' },
          { statusAntes: 'RECEPCAO', statusDepois: 'DIAGNOSTICO' },
          { statusAntes: 'DIAGNOSTICO', statusDepois: 'AGUARDANDO_APROVACAO' },
          { statusAntes: 'AGUARDANDO_APROVACAO', statusDepois: 'APROVADA', obs: 'Orçamento aprovado pelo cliente' },
          { statusAntes: 'APROVADA', statusDepois: 'EM_MANUTENCAO' },
        ],
      },
    },
  })

  // Pagamento PIX da OS2
  const pagOS2 = await prisma.pagamento.create({
    data: {
      osId: os2.id,
      metodo: 'PIX',
      valor: 450,
      qtdParcelas: 1,
      statusConcil: 'PENDENTE',
    },
  })
  await prisma.parcelaReceber.create({
    data: { pagamentoId: pagOS2.id, numero: 1, valor: 450, dataPrevista: new Date() },
  })
  console.log('✓ OS #2 criada (Em Manutenção):', os2.numero)

  // OS com pagamento cartão parcelado (conciliação pendente)
  const os3 = await prisma.ordemServico.create({
    data: {
      numero: 3,
      veiculoId: hb20Pedro.id,
      queixa: 'Revisão completa 30.000 km.',
      status: 'ENTREGUE',
      valorTotal: 1200,
      valorPago: 1200,
      dataEntrega: new Date(),
      historico: {
        create: [
          { statusDepois: 'RECEPCAO' },
          { statusAntes: 'RECEPCAO', statusDepois: 'DIAGNOSTICO' },
          { statusAntes: 'DIAGNOSTICO', statusDepois: 'AGUARDANDO_APROVACAO' },
          { statusAntes: 'AGUARDANDO_APROVACAO', statusDepois: 'APROVADA' },
          { statusAntes: 'APROVADA', statusDepois: 'EM_MANUTENCAO' },
          { statusAntes: 'EM_MANUTENCAO', statusDepois: 'VALIDACAO' },
          { statusAntes: 'VALIDACAO', statusDepois: 'AGUARDANDO_RETIRADA' },
          { statusAntes: 'AGUARDANDO_RETIRADA', statusDepois: 'ENTREGUE' },
        ],
      },
    },
  })

  // Pagamento: R$700 PIX + R$500 cartão crédito 3x Rede
  const pagPix = await prisma.pagamento.create({
    data: { osId: os3.id, metodo: 'PIX', valor: 700, qtdParcelas: 1, statusConcil: 'PENDENTE' },
  })
  await prisma.parcelaReceber.create({
    data: { pagamentoId: pagPix.id, numero: 1, valor: 700, dataPrevista: new Date() },
  })

  const pagCartao = await prisma.pagamento.create({
    data: { osId: os3.id, metodo: 'CARTAO_CREDITO', adquirente: 'REDE', nsu: '987654321', valor: 500, qtdParcelas: 3, statusConcil: 'PENDENTE' },
  })
  const hoje = new Date()
  await prisma.parcelaReceber.createMany({
    data: [
      { pagamentoId: pagCartao.id, numero: 1, valor: 166.67, dataPrevista: new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()) },
      { pagamentoId: pagCartao.id, numero: 2, valor: 166.67, dataPrevista: new Date(hoje.getFullYear(), hoje.getMonth() + 2, hoje.getDate()) },
      { pagamentoId: pagCartao.id, numero: 3, valor: 166.66, dataPrevista: new Date(hoje.getFullYear(), hoje.getMonth() + 3, hoje.getDate()) },
    ],
  })
  console.log('✓ OS #3 criada (Entregue, pagamento misto):', os3.numero)

  // Agendamento para amanhã
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  amanha.setHours(9, 0, 0, 0)
  await prisma.agendamento.create({
    data: {
      clienteId: joao.id,
      veiculoId: civicJoao.id,
      dataHora: amanha,
      tipoServico: 'Revisão + troca de óleo',
      queixa: 'Manutenção preventiva 40.000 km',
      status: 'CONFIRMADO',
    },
  })
  console.log('✓ Agendamento criado para amanhã')

  console.log('\n✅ Seed concluído!')
  console.log('\nUsuários para login:')
  console.log('  admin@pink.com / pink123')
  console.log('  recepcao@pink.com / pink123')
  console.log('  tecnico@pink.com / pink123')
  console.log('  financeiro@pink.com / pink123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
