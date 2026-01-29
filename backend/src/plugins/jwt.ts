import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: number }
    user: { userId: number }
  }
}

async function jwtPlugin(fastify: FastifyInstance) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  fastify.register(fastifyJwt, {
    secret,
  })
}

export default fp(jwtPlugin, {
  name: 'jwt',
})
