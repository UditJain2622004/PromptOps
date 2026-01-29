import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { workspaceUserRole } from '../generated/prisma/client.ts'

export interface WorkspaceContext {
  id: number
  role: workspaceUserRole
}

declare module 'fastify' {
  interface FastifyRequest {
    workspace: WorkspaceContext
  }
}

interface WorkspaceParams {
  workspaceId: string
}

async function workspacePlugin(fastify: FastifyInstance) {
  // Decorator to resolve workspace from URL params and verify membership
  // Using undefined as initial value, will be set in onRequest hook
  if (!fastify.hasRequestDecorator('workspace')) {
    fastify.decorateRequest('workspace', undefined as unknown as WorkspaceContext)
  }

  fastify.addHook('onRequest', async (request: FastifyRequest<{ Params: WorkspaceParams }>, reply: FastifyReply) => {
    // First, verify JWT
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    // Resolve workspaceId from URL params
    const workspaceIdParam = request.params.workspaceId
    if (!workspaceIdParam) {
      return reply.status(400).send({ error: 'Workspace ID is required' })
    }

    const workspaceId = parseInt(workspaceIdParam, 10)
    if (isNaN(workspaceId)) {
      return reply.status(400).send({ error: 'Invalid workspace ID' })
    }

    // Verify membership
    const userId = request.user.userId
    const membership = await fastify.prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    })

    if (!membership) {
      return reply.status(403).send({ error: 'Access denied to this workspace' })
    }

    // Attach workspace context to request
    request.workspace = {
      id: workspaceId,
      role: membership.role,
    }
  })
}

export default fp(workspacePlugin, {
  name: 'workspace',
  dependencies: ['prisma', 'jwt'],
})
