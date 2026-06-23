import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; perfil: string; filialId: string | null }
    user:    { id: string; perfil: string; filialId: string | null }
  }
}
