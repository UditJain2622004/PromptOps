import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AgentService } from '../services/agent.service.js'
import { assertPermission } from '../utils/rbac.js'

// ─── Request Types ──────────────────────────────────────────────────────────

interface CreateAgentBody {
  name: string
  description?: string
}

interface UpdateAgentBody {
  name?: string
  description?: string
}

interface AgentParams {
  id: string
}

interface CreateVersionBody {
  systemInstruction: string
  config: object
}

interface SetActiveVersionBody {
  versionId: number
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function agentsRoutes(fastify: FastifyInstance) {
  const agentService = new AgentService(fastify.prisma)

  // POST /agents - Create a new agent (OWNER/ADMIN)
  fastify.post<{ Body: CreateAgentBody }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateAgentBody }>, reply: FastifyReply) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'agent:create')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId

      const agent = await agentService.createAgent(request.body, workspaceId, userId)

      return reply.status(201).send({ agent })
    }
  )

  // GET /agents - List all agents in workspace
  fastify.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const workspaceId = request.workspace.id

      const agents = await agentService.listAgents(workspaceId)

      return reply.send({ agents })
    }
  )

  // GET /agents/:id - Get a single agent
  fastify.get<{ Params: AgentParams }>(
    '/:id',
    async (request: FastifyRequest<{ Params: AgentParams }>, reply: FastifyReply) => {
      const workspaceId = request.workspace.id
      const agentId = parseInt(request.params.id, 10)

      if (isNaN(agentId)) {
        return reply.status(400).send({ error: 'Invalid agent ID' })
      }

      const agent = await agentService.getAgentById(agentId, workspaceId)

      if (!agent) {
        return reply.status(404).send({ error: 'Agent not found' })
      }

      return reply.send({ agent })
    }
  )

  // PATCH /agents/:id - Update an agent (OWNER/ADMIN)
  fastify.patch<{ Params: AgentParams; Body: UpdateAgentBody }>(
    '/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: AgentParams; Body: UpdateAgentBody }>,
      reply: FastifyReply
    ) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'agent:update')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId
      const agentId = parseInt(request.params.id, 10)

      if (isNaN(agentId)) {
        return reply.status(400).send({ error: 'Invalid agent ID' })
      }

      const agent = await agentService.updateAgent(agentId, workspaceId, request.body, userId)

      if (!agent) {
        return reply.status(404).send({ error: 'Agent not found' })
      }

      return reply.send({ agent })
    }
  )

  // DELETE /agents/:id - Delete an agent (OWNER only)
  fastify.delete<{ Params: AgentParams }>(
    '/:id',
    async (request: FastifyRequest<{ Params: AgentParams }>, reply: FastifyReply) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'agent:delete')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const agentId = parseInt(request.params.id, 10)

      if (isNaN(agentId)) {
        return reply.status(400).send({ error: 'Invalid agent ID' })
      }

      const result = await agentService.deleteAgent(agentId, workspaceId)

      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.status(204).send()
    }
  )

  // ─── AgentVersion Routes ──────────────────────────────────────────────────

  // POST /agents/:id/versions - Create a new version (OWNER/ADMIN)
  fastify.post<{ Params: AgentParams; Body: CreateVersionBody }>(
    '/:id/versions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['systemInstruction', 'config'],
          properties: {
            systemInstruction: { type: 'string', minLength: 1 },
            config: { type: 'object' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: AgentParams; Body: CreateVersionBody }>,
      reply: FastifyReply
    ) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'agent:version:create')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId
      const agentId = parseInt(request.params.id, 10)

      if (isNaN(agentId)) {
        return reply.status(400).send({ error: 'Invalid agent ID' })
      }

      const version = await agentService.createAgentVersion(
        agentId,
        workspaceId,
        request.body,
        userId
      )

      if (!version) {
        return reply.status(404).send({ error: 'Agent not found' })
      }

      return reply.status(201).send({ version })
    }
  )

  // GET /agents/:id/versions - List all versions
  fastify.get<{ Params: AgentParams }>(
    '/:id/versions',
    async (request: FastifyRequest<{ Params: AgentParams }>, reply: FastifyReply) => {
      const workspaceId = request.workspace.id
      const agentId = parseInt(request.params.id, 10)

      if (isNaN(agentId)) {
        return reply.status(400).send({ error: 'Invalid agent ID' })
      }

      const versions = await agentService.listAgentVersions(agentId, workspaceId)

      if (versions === null) {
        return reply.status(404).send({ error: 'Agent not found' })
      }

      return reply.send({ versions })
    }
  )

  // PATCH /agents/:id/active-version - Set active version (OWNER/ADMIN)
  fastify.patch<{ Params: AgentParams; Body: SetActiveVersionBody }>(
    '/:id/active-version',
    {
      schema: {
        body: {
          type: 'object',
          required: ['versionId'],
          properties: {
            versionId: { type: 'integer' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: AgentParams; Body: SetActiveVersionBody }>,
      reply: FastifyReply
    ) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'agent:version:activate')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId
      const agentId = parseInt(request.params.id, 10)

      if (isNaN(agentId)) {
        return reply.status(400).send({ error: 'Invalid agent ID' })
      }

      const result = await agentService.setActiveVersion(
        agentId,
        workspaceId,
        request.body.versionId,
        userId
      )

      if (!result.success) {
        const status = result.error === 'Agent not found' ? 404 : 400
        return reply.status(status).send({ error: result.error })
      }

      return reply.send({ agent: result.agent })
    }
  )
}
