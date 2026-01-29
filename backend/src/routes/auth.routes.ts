import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from '../services/auth.service.js'

interface RegisterBody {
  name: string
  email: string
  password: string
}

interface LoginBody {
  email: string
  password: string
}

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify.prisma)

  // POST /auth/register
  fastify.post<{ Body: RegisterBody }>(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      try {
        const user = await authService.register(request.body)

        const token = fastify.jwt.sign({ userId: user.id })

        return reply.status(201).send({
          user,
          token,
        })
      } catch (error) {
        if (error instanceof Error && error.message === 'User with this email already exists') {
          return reply.status(409).send({ error: error.message })
        }
        throw error
      }
    }
  )

  // POST /auth/login
  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      try {
        const user = await authService.login(request.body)

        const token = fastify.jwt.sign({ userId: user.id })

        return reply.send({
          user,
          token,
        })
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid email or password') {
          return reply.status(401).send({ error: error.message })
        }
        throw error
      }
    }
  )
}
