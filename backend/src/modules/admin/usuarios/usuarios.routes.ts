import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { AppError, NotFoundError } from '../../../shared/errors'

const PERFIS = ['ADMIN', 'RECEPCAO', 'TECNICO', 'FINANCEIRO'] as const

export default async function usuariosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async () => {
    return prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
      orderBy: { nome: 'asc' },
    })
  })

  app.post('/', async (req, reply) => {
    const user = (req as { user?: { perfil?: string } }).user
    if (user?.perfil !== 'ADMIN') throw new AppError('Apenas administradores podem criar usuários', 403)

    const data = z.object({
      nome:  z.string().min(2),
      email: z.string().email(),
      senha: z.string().min(6),
      perfil: z.enum(PERFIS),
    }).parse(req.body)

    const existe = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (existe) throw new AppError('E-mail já cadastrado')

    const senhaHash = await bcrypt.hash(data.senha, 10)
    const usuario = await prisma.usuario.create({
      data: { ...data, senha: senhaHash },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
    })
    return reply.status(201).send(usuario)
  })

  app.put('/:id', async (req) => {
    const user = (req as { user?: { perfil?: string } }).user
    if (user?.perfil !== 'ADMIN') throw new AppError('Apenas administradores podem editar usuários', 403)

    const { id } = req.params as { id: string }
    const data = z.object({
      nome:     z.string().min(2).optional(),
      perfil:   z.enum(PERFIS).optional(),
      filialId: z.string().uuid().nullable().optional(),
    }).parse(req.body)

    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario) throw new NotFoundError('Usuário')

    return prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nome: true, email: true, perfil: true, filialId: true, ativo: true, createdAt: true },
    })
  })

  app.patch('/:id/toggle-ativo', async (req) => {
    const user = (req as { user?: { perfil?: string } }).user
    if (user?.perfil !== 'ADMIN') throw new AppError('Apenas administradores podem alterar usuários', 403)

    const { id } = req.params as { id: string }
    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario) throw new NotFoundError('Usuário')

    return prisma.usuario.update({
      where: { id },
      data: { ativo: !usuario.ativo },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
    })
  })

  app.patch('/:id/senha', async (req) => {
    const user = (req as { user?: { perfil?: string } }).user
    if (user?.perfil !== 'ADMIN') throw new AppError('Apenas administradores podem resetar senhas', 403)

    const { id } = req.params as { id: string }
    const { senha } = z.object({ senha: z.string().min(6) }).parse(req.body)

    const senhaHash = await bcrypt.hash(senha, 10)
    await prisma.usuario.update({ where: { id }, data: { senha: senhaHash } })
    return { ok: true }
  })
}
