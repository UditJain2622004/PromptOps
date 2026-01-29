import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { EvaluationService } from '../services/evaluation.service.js'
import { EvaluationDefinitionScope } from '../generated/prisma/client.ts'
import { assertPermission } from '../utils/rbac.js'

// ─── Request Types ──────────────────────────────────────────────────────────

interface CreateDefinitionBody {
  name?: string
  scope: EvaluationDefinitionScope
  agentId?: number
  definition: object
}

interface UpdateDefinitionBody {
  name?: string
  scope?: EvaluationDefinitionScope
  agentId?: number | null
  definition?: object
}

interface DefinitionParams {
  id: string
}

interface CreateRunBody {
  name?: string
  configSnapshot: {
    agentVersionIds: number[]
    datasetId: number
    evaluationDefinitionIds: number[]
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function evaluationRoutes(fastify: FastifyInstance) {
  const evaluationService = new EvaluationService(fastify.prisma)

  // ─── EvaluationDefinition Routes ──────────────────────────────────────────

  // POST /evaluation-definitions - Create a new evaluation definition (OWNER/ADMIN)
  fastify.post<{ Body: CreateDefinitionBody }>(
    '/evaluation-definitions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['scope', 'definition'],
          properties: {
            name: { type: 'string', maxLength: 255 },
            scope: { type: 'string', enum: ['WORKSPACE', 'AGENT'] },
            agentId: { type: 'integer' },
            definition: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateDefinitionBody }>, reply: FastifyReply) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'evaluation:definition:create')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId

      const result = await evaluationService.createDefinition(request.body, workspaceId, userId)

      if (!result.success) {
        return reply.status(400).send({ error: result.error })
      }

      return reply.status(201).send({ definition: result.definition })
    }
  )

  // GET /evaluation-definitions - List all evaluation definitions in workspace (all roles)
  fastify.get(
    '/evaluation-definitions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const workspaceId = request.workspace.id

      const definitions = await evaluationService.listDefinitions(workspaceId)

      return reply.send({ definitions })
    }
  )

  // GET /evaluation-definitions/:id - Get a single evaluation definition (all roles)
  fastify.get<{ Params: DefinitionParams }>(
    '/evaluation-definitions/:id',
    async (request: FastifyRequest<{ Params: DefinitionParams }>, reply: FastifyReply) => {
      const workspaceId = request.workspace.id
      const definitionId = parseInt(request.params.id, 10)

      if (isNaN(definitionId)) {
        return reply.status(400).send({ error: 'Invalid definition ID' })
      }

      const definition = await evaluationService.getDefinitionById(definitionId, workspaceId)

      if (!definition) {
        return reply.status(404).send({ error: 'Evaluation definition not found' })
      }

      return reply.send({ definition })
    }
  )

  // PATCH /evaluation-definitions/:id - Update an evaluation definition (OWNER/ADMIN)
  fastify.patch<{ Params: DefinitionParams; Body: UpdateDefinitionBody }>(
    '/evaluation-definitions/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 255 },
            scope: { type: 'string', enum: ['WORKSPACE', 'AGENT'] },
            agentId: { type: ['integer', 'null'] },
            definition: { type: 'object' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: DefinitionParams; Body: UpdateDefinitionBody }>,
      reply: FastifyReply
    ) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'evaluation:definition:update')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId
      const definitionId = parseInt(request.params.id, 10)

      if (isNaN(definitionId)) {
        return reply.status(400).send({ error: 'Invalid definition ID' })
      }

      const result = await evaluationService.updateDefinition(
        definitionId,
        workspaceId,
        request.body,
        userId
      )

      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.send({ definition: result.definition })
    }
  )

  // DELETE /evaluation-definitions/:id - Delete an evaluation definition (OWNER only)
  fastify.delete<{ Params: DefinitionParams }>(
    '/evaluation-definitions/:id',
    async (request: FastifyRequest<{ Params: DefinitionParams }>, reply: FastifyReply) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'evaluation:definition:delete')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const definitionId = parseInt(request.params.id, 10)

      if (isNaN(definitionId)) {
        return reply.status(400).send({ error: 'Invalid definition ID' })
      }

      const result = await evaluationService.deleteDefinition(definitionId, workspaceId)

      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.status(204).send()
    }
  )

  // ─── EvaluationRun Routes ─────────────────────────────────────────────────

  // POST /evaluation-runs - Create a new evaluation run (OWNER/ADMIN)
  fastify.post<{ Body: CreateRunBody }>(
    '/evaluation-runs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['configSnapshot'],
          properties: {
            name: { type: 'string', maxLength: 255 },
            configSnapshot: {
              type: 'object',
              required: ['agentVersionIds', 'datasetId', 'evaluationDefinitionIds'],
              properties: {
                agentVersionIds: {
                  type: 'array',
                  items: { type: 'integer' },
                  minItems: 1,
                },
                datasetId: { type: 'integer' },
                evaluationDefinitionIds: {
                  type: 'array',
                  items: { type: 'integer' },
                  minItems: 1,
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateRunBody }>, reply: FastifyReply) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'evaluation:run:create')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId

      const run = await evaluationService.createRun(request.body, workspaceId, userId)

      return reply.status(201).send({ run })
    }
  )
}
