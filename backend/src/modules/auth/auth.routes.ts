import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../../shared/prisma'
import { AppError } from '../../shared/errors'

export default async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      senha: z.string().min(6),
    }).parse(req.body)

    const usuario = await prisma.usuario.findUnique({ where: { email: body.email } })
    if (!usuario || !usuario.ativo) throw new AppError('Credenciais inválidas', 401)

    const senhaOk = await bcrypt.compare(body.senha, usuario.senha)
    if (!senhaOk) throw new AppError('Credenciais inválidas', 401)

    const token = app.jwt.sign(
      { id: usuario.id, perfil: usuario.perfil },
      { expiresIn: '8h' },
    )

    return reply.send({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    })
  })

  app.post('/registrar', async (req, reply) => {
    const body = z.object({
      nome: z.string().min(2),
      email: z.string().email(),
      senha: z.string().min(6),
      perfil: z.enum(['ADMIN', 'RECEPCAO', 'TECNICO', 'FINANCEIRO']),
    }).parse(req.body)

    const existe = await prisma.usuario.findUnique({ where: { email: body.email } })
    if (existe) throw new AppError('Email já cadastrado')

    const hash = await bcrypt.hash(body.senha, 10)
    const usuario = await prisma.usuario.create({
      data: { ...body, senha: hash },
      select: { id: true, nome: true, email: true, perfil: true },
    })

    return reply.status(201).send(usuario)
  })
}
