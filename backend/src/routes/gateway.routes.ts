import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Message, SenderRole, GatewayError, GatewayErrorCode } from '../llm/types.js'
import { assertPermission } from '../utils/rbac.js'

// ─── Request Types ──────────────────────────────────────────────────────────

interface ExecuteAgentParams {
  agentId: string
}

interface ExecuteAgentBody {
  messages: {
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string
  }[]
  versionId?: number
  overrides?: {
    temperature?: number
    topP?: number
    maxTokens?: number
    model?: string
  }
}

// ─── Error Code to HTTP Status Mapping ──────────────────────────────────────

const ERROR_STATUS_MAP: Record<GatewayErrorCode, number> = {
  AGENT_NOT_FOUND: 404,
  VERSION_NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  PROVIDER_ERROR: 502,
  ADAPTER_ERROR: 500,
  TIMEOUT_ERROR: 504,
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function mapRole(role: string): SenderRole {
  switch (role) {
    case 'user':
      return SenderRole.User
    case 'assistant':
      return SenderRole.Assistant
    case 'system':
      return SenderRole.System
    case 'tool':
      return SenderRole.Tool
    default:
      throw new Error(`Invalid message role: ${role}`)
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function gatewayRoutes(fastify: FastifyInstance) {
  /**
   * POST /gateway/agents/:agentId/execute
   * 
   * Executes an agent with the given input messages through the LLM Gateway.
   * Uses the active agent version (or specified versionId) to build the request.
   * 
   * Request Body:
   * - messages: Array of {role, content} — the conversation history/input
   * - versionId?: Specific version to use (defaults to active version)
   * - overrides?: Runtime overrides for model, temperature, etc.
   * 
   * Response:
   * - model: The model that was used
   * - output: The assistant's response text
   * - usage: Token usage statistics (if available)
   * 
   * Error Response:
   * - error: Error message
   * - code: Error code (AGENT_NOT_FOUND, PROVIDER_ERROR, etc.)
   * - context: Additional context for debugging (only in non-production)
   */
  fastify.post<{ Params: ExecuteAgentParams; Body: ExecuteAgentBody }>(
    '/agents/:agentId/execute',
    {
      schema: {
        body: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system', 'tool'] },
                  content: { type: 'string' },
                },
              },
            },
            versionId: { type: 'integer' },
            overrides: {
              type: 'object',
              properties: {
                temperature: { type: 'number', minimum: 0, maximum: 2 },
                topP: { type: 'number', minimum: 0, maximum: 1 },
                maxTokens: { type: 'integer', minimum: 1 },
                model: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ExecuteAgentParams; Body: ExecuteAgentBody }>,
      reply: FastifyReply
    ) => {
      // RBAC check - executing an agent requires gateway:execute permission
      try {
        assertPermission(request.workspace.role, 'gateway:execute')
      } catch (err) {
        return reply.status(403).send({ 
          error: (err as Error).message,
          code: 'PERMISSION_DENIED',
        })
      }

      const workspaceId = request.workspace.id
      const agentId = parseInt(request.params.agentId, 10)

      if (isNaN(agentId)) {
        return reply.status(400).send({ 
          error: 'Invalid agent ID',
          code: 'VALIDATION_ERROR',
        })
      }

      // Convert input messages to internal format
      let inputMessages: Message[]
      try {
        inputMessages = request.body.messages.map((msg) => ({
          role: mapRole(msg.role),
          content: msg.content,
        }))
      } catch (err) {
        return reply.status(400).send({
          error: (err as Error).message,
          code: 'VALIDATION_ERROR',
        })
      }

      try {
        const response = await fastify.gateway.executeAgent({
          agentId,
          workspaceId,
          agentVersionId: request.body.versionId,
          inputMessages,
          overrides: request.body.overrides,
        })

        // Return a simplified response for the API consumer
        return reply.send({
          model: response.model,
          output: response.choices[0]?.text ?? '',
          finishReason: response.choices[0]?.finishReason,
          usage: response.usage,
        })
      } catch (err) {
        // Handle GatewayError with proper status codes and structured response
        if (err instanceof GatewayError) {
          const status = ERROR_STATUS_MAP[err.code] ?? 500

          // Log the full error with context for debugging
          request.log.error(
            { 
              err, 
              agentId, 
              workspaceId,
              errorCode: err.code,
              context: err.context,
            }, 
            'Gateway execution failed'
          )

          return reply.status(status).send({
            error: err.message,
            code: err.code,
            // Include context in non-production environments for debugging
            ...(process.env.NODE_ENV !== 'production' && err.context && {
              context: err.context,
            }),
          })
        }

        // Handle unexpected errors
        request.log.error({ err, agentId, workspaceId }, 'Unexpected gateway error')

        return reply.status(500).send({
          error: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
          ...(process.env.NODE_ENV !== 'production' && {
            details: err instanceof Error ? err.message : 'Unknown error',
          }),
        })
      }
    }
  )
}
