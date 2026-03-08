import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { WorkspaceService } from '../services/workspace.service.js'
import { ProxyApiKeyService } from '../services/proxy-api-key.service.js'
import { assertPermission } from '../utils/rbac.js'
import { workspaceUserRole } from '../generated/prisma/client.ts'

// ─── Request Types ──────────────────────────────────────────────────────────

interface CreateWorkspaceBody {
  name: string
}

interface WorkspaceParams {
  id: string
}

interface InviteBody {
  email: string
  role?: workspaceUserRole
}

interface UserParams {
  id: string
  userId: string
}

interface ApiKeyParams {
  id: string
  apiKeyId: string
}

interface ChangeRoleBody {
  role: workspaceUserRole
}

// ─── Helper: Resolve workspace membership for workspace-level routes ────────

async function resolveWorkspaceMembership(
  fastify: FastifyInstance,
  userId: number,
  workspaceId: number,
  reply: FastifyReply
): Promise<{ id: number; role: workspaceUserRole } | null> {
  const membership = await fastify.prisma.workspaceUser.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  })

  if (!membership) {
    reply.status(403).send({ error: 'Access denied to this workspace' })
    return null
  }

  return { id: workspaceId, role: membership.role }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function workspacesRoutes(fastify: FastifyInstance) {
  const workspaceService = new WorkspaceService(fastify.prisma)
  const proxyApiKeyService = new ProxyApiKeyService(fastify.prisma)

  // All workspace routes require authentication
  fastify.addHook('onRequest', fastify.authenticate)

  // POST /workspaces - Create a new workspace (anyone can create)
  fastify.post<{ Body: CreateWorkspaceBody }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateWorkspaceBody }>, reply: FastifyReply) => {
      const userId = request.user.userId

      const workspace = await workspaceService.create(request.body, userId)

      return reply.status(201).send({ workspace })
    }
  )

  // GET /workspaces - List all workspaces for the authenticated user
  fastify.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.userId

      const workspaces = await workspaceService.listForUser(userId)

      return reply.send({ workspaces })
    }
  )

  // DELETE /workspaces/:id - Delete workspace (OWNER only)
  fastify.delete<{ Params: WorkspaceParams }>(
    '/:id',
    async (request: FastifyRequest<{ Params: WorkspaceParams }>, reply: FastifyReply) => {
      const userId = request.user.userId
      const workspaceId = parseInt(request.params.id, 10)

      if (isNaN(workspaceId)) {
        return reply.status(400).send({ error: 'Invalid workspace ID' })
      }

      // Check membership and role
      const workspace = await resolveWorkspaceMembership(fastify, userId, workspaceId, reply)
      if (!workspace) return

      // Check permission
      try {
        assertPermission(workspace.role, 'workspace:delete')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const result = await workspaceService.deleteWorkspace(workspaceId)

      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.status(204).send()
    }
  )

  // GET /workspaces/:id/users - List workspace members (all roles can view)
  fastify.get<{ Params: WorkspaceParams }>(
    '/:id/users',
    async (request: FastifyRequest<{ Params: WorkspaceParams }>, reply: FastifyReply) => {
      const userId = request.user.userId
      const workspaceId = parseInt(request.params.id, 10)

      if (isNaN(workspaceId)) {
        return reply.status(400).send({ error: 'Invalid workspace ID' })
      }

      // Check membership (all roles can view members)
      const workspace = await resolveWorkspaceMembership(fastify, userId, workspaceId, reply)
      if (!workspace) return

      const members = await workspaceService.listMembers(workspaceId)

      return reply.send({ members })
    }
  )

  // POST /workspaces/:id/api-keys - Create PromptOps proxy API key (OWNER/ADMIN)
  fastify.post<{ Params: WorkspaceParams }>(
    '/:id/api-keys',
    async (request: FastifyRequest<{ Params: WorkspaceParams }>, reply: FastifyReply) => {
      const userId = request.user.userId
      const workspaceId = parseInt(request.params.id, 10)

      if (isNaN(workspaceId)) {
        return reply.status(400).send({ error: 'Invalid workspace ID' })
      }

      const workspace = await resolveWorkspaceMembership(fastify, userId, workspaceId, reply)
      if (!workspace) return

      try {
        assertPermission(workspace.role, 'workspace:api-key:manage')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const created = await proxyApiKeyService.create(workspaceId)

      return reply.status(201).send({
        apiKey: {
          id: created.id,
          key: created.apiKey,
          createdAt: created.createdAt,
        },
      })
    }
  )

  // GET /workspaces/:id/api-keys - List PromptOps proxy API keys (OWNER/ADMIN)
  fastify.get<{ Params: WorkspaceParams }>(
    '/:id/api-keys',
    async (request: FastifyRequest<{ Params: WorkspaceParams }>, reply: FastifyReply) => {
      const userId = request.user.userId
      const workspaceId = parseInt(request.params.id, 10)

      if (isNaN(workspaceId)) {
        return reply.status(400).send({ error: 'Invalid workspace ID' })
      }

      const workspace = await resolveWorkspaceMembership(fastify, userId, workspaceId, reply)
      if (!workspace) return

      try {
        assertPermission(workspace.role, 'workspace:api-key:manage')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const apiKeys = await proxyApiKeyService.list(workspaceId)
      return reply.send({ apiKeys })
    }
  )

  // DELETE /workspaces/:id/api-keys/:apiKeyId - Revoke PromptOps proxy API key (OWNER/ADMIN)
  fastify.delete<{ Params: ApiKeyParams }>(
    '/:id/api-keys/:apiKeyId',
    async (request: FastifyRequest<{ Params: ApiKeyParams }>, reply: FastifyReply) => {
      const userId = request.user.userId
      const workspaceId = parseInt(request.params.id, 10)
      const apiKeyId = parseInt(request.params.apiKeyId, 10)

      if (isNaN(workspaceId) || isNaN(apiKeyId)) {
        return reply.status(400).send({ error: 'Invalid workspace ID or api key ID' })
      }

      const workspace = await resolveWorkspaceMembership(fastify, userId, workspaceId, reply)
      if (!workspace) return

      try {
        assertPermission(workspace.role, 'workspace:api-key:manage')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const revoked = await proxyApiKeyService.revoke(workspaceId, apiKeyId)
      if (!revoked) {
        return reply.status(404).send({ error: 'API key not found or already revoked' })
      }

      return reply.status(204).send()
    }
  )

  // POST /workspaces/:id/invite - Invite user by email (OWNER/ADMIN)
  fastify.post<{ Params: WorkspaceParams; Body: InviteBody }>(
    '/:id/invite',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['OWNER', 'ADMIN', 'USER'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: WorkspaceParams; Body: InviteBody }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.userId
      const workspaceId = parseInt(request.params.id, 10)

      if (isNaN(workspaceId)) {
        return reply.status(400).send({ error: 'Invalid workspace ID' })
      }

      // Check membership and role
      const workspace = await resolveWorkspaceMembership(fastify, userId, workspaceId, reply)
      if (!workspace) return

      // Check permission
      try {
        assertPermission(workspace.role, 'workspace:invite')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const result = await workspaceService.inviteUser(request.body, workspaceId, userId)

      if (!result.success) {
        return reply.status(400).send({ error: result.error })
      }

      return reply.status(201).send({ member: result.member })
    }
  )

  // PATCH /workspaces/:id/users/:userId - Change user role (OWNER only)
  fastify.patch<{ Params: UserParams; Body: ChangeRoleBody }>(
    '/:id/users/:userId',
    {
      schema: {
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['OWNER', 'ADMIN', 'USER'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: UserParams; Body: ChangeRoleBody }>,
      reply: FastifyReply
    ) => {
      const actorUserId = request.user.userId
      const workspaceId = parseInt(request.params.id, 10)
      const targetUserId = parseInt(request.params.userId, 10)

      if (isNaN(workspaceId) || isNaN(targetUserId)) {
        return reply.status(400).send({ error: 'Invalid workspace or user ID' })
      }

      // Check membership and role
      const workspace = await resolveWorkspaceMembership(fastify, actorUserId, workspaceId, reply)
      if (!workspace) return

      // Check permission
      try {
        assertPermission(workspace.role, 'workspace:change-role')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const result = await workspaceService.changeUserRole(
        targetUserId,
        workspaceId,
        request.body,
        actorUserId
      )

      if (!result.success) {
        return reply.status(400).send({ error: result.error })
      }

      return reply.send({ member: result.member })
    }
  )
}
