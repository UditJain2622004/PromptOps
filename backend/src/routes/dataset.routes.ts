import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { DatasetService } from '../services/dataset.service.js'
import { DatasetScope, DataItemType } from '../generated/prisma/client.ts'
import { assertPermission } from '../utils/rbac.js'

// ─── Request Types ──────────────────────────────────────────────────────────

interface CreateDatasetBody {
  name?: string
  scope: DatasetScope
  agentId?: number
}

interface UpdateDatasetBody {
  name?: string
  scope?: DatasetScope
  agentId?: number | null
}

interface DatasetParams {
  id: string
}

interface CreateDataItemBody {
  type?: DataItemType
  data: object
}

interface UpdateDataItemBody {
  type?: DataItemType
  data?: object
}

interface DataItemParams {
  id: string
  itemId: string
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function datasetRoutes(fastify: FastifyInstance) {
  const datasetService = new DatasetService(fastify.prisma)

  // ─── Dataset Routes ───────────────────────────────────────────────────────

  // POST /datasets - Create a new dataset (OWNER/ADMIN)
  fastify.post<{ Body: CreateDatasetBody }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['scope'],
          properties: {
            name: { type: 'string', maxLength: 255 },
            scope: { type: 'string', enum: ['WORKSPACE', 'AGENT'] },
            agentId: { type: 'integer' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateDatasetBody }>, reply: FastifyReply) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'dataset:create')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId

      const result = await datasetService.createDataset(request.body, workspaceId, userId)

      if (!result.success) {
        return reply.status(400).send({ error: result.error })
      }

      return reply.status(201).send({ dataset: result.dataset })
    }
  )

  // GET /datasets - List all datasets in workspace (all roles)
  fastify.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const workspaceId = request.workspace.id

      const datasets = await datasetService.listDatasets(workspaceId)

      return reply.send({ datasets })
    }
  )

  // GET /datasets/:id - Get a single dataset (all roles)
  fastify.get<{ Params: DatasetParams }>(
    '/:id',
    async (request: FastifyRequest<{ Params: DatasetParams }>, reply: FastifyReply) => {
      const workspaceId = request.workspace.id
      const datasetId = parseInt(request.params.id, 10)

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: 'Invalid dataset ID' })
      }

      const dataset = await datasetService.getDatasetById(datasetId, workspaceId)

      if (!dataset) {
        return reply.status(404).send({ error: 'Dataset not found' })
      }

      return reply.send({ dataset })
    }
  )

  // PATCH /datasets/:id - Update a dataset (OWNER/ADMIN)
  fastify.patch<{ Params: DatasetParams; Body: UpdateDatasetBody }>(
    '/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 255 },
            scope: { type: 'string', enum: ['WORKSPACE', 'AGENT'] },
            agentId: { type: ['integer', 'null'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: DatasetParams; Body: UpdateDatasetBody }>,
      reply: FastifyReply
    ) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'dataset:update')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId
      const datasetId = parseInt(request.params.id, 10)

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: 'Invalid dataset ID' })
      }

      const result = await datasetService.updateDataset(
        datasetId,
        workspaceId,
        request.body,
        userId
      )

      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.send({ dataset: result.dataset })
    }
  )

  // DELETE /datasets/:id - Delete a dataset (OWNER only)
  fastify.delete<{ Params: DatasetParams }>(
    '/:id',
    async (request: FastifyRequest<{ Params: DatasetParams }>, reply: FastifyReply) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'dataset:delete')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const datasetId = parseInt(request.params.id, 10)

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: 'Invalid dataset ID' })
      }

      const result = await datasetService.deleteDataset(datasetId, workspaceId)

      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.status(204).send()
    }
  )

  // ─── DataItem Routes ──────────────────────────────────────────────────────

  // POST /datasets/:id/items - Create a new data item (OWNER/ADMIN)
  fastify.post<{ Params: DatasetParams; Body: CreateDataItemBody }>(
    '/:id/items',
    {
      schema: {
        body: {
          type: 'object',
          required: ['data'],
          properties: {
            type: { type: 'string', enum: ['TYPE1', 'TYPE2'] },
            data: { type: 'object' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: DatasetParams; Body: CreateDataItemBody }>,
      reply: FastifyReply
    ) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'dataset:item:create')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId
      const datasetId = parseInt(request.params.id, 10)

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: 'Invalid dataset ID' })
      }

      const result = await datasetService.createDataItem(
        datasetId,
        workspaceId,
        request.body,
        userId
      )

      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.status(201).send({ dataItem: result.dataItem })
    }
  )

  // GET /datasets/:id/items - List all data items in dataset (all roles)
  fastify.get<{ Params: DatasetParams }>(
    '/:id/items',
    async (request: FastifyRequest<{ Params: DatasetParams }>, reply: FastifyReply) => {
      const workspaceId = request.workspace.id
      const datasetId = parseInt(request.params.id, 10)

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: 'Invalid dataset ID' })
      }

      const dataItems = await datasetService.listDataItems(datasetId, workspaceId)

      if (dataItems === null) {
        return reply.status(404).send({ error: 'Dataset not found' })
      }

      return reply.send({ dataItems })
    }
  )

  // GET /datasets/:id/items/:itemId - Get a single data item (all roles)
  fastify.get<{ Params: DataItemParams }>(
    '/:id/items/:itemId',
    async (request: FastifyRequest<{ Params: DataItemParams }>, reply: FastifyReply) => {
      const workspaceId = request.workspace.id
      const datasetId = parseInt(request.params.id, 10)
      const dataItemId = parseInt(request.params.itemId, 10)

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: 'Invalid dataset ID' })
      }

      if (isNaN(dataItemId)) {
        return reply.status(400).send({ error: 'Invalid data item ID' })
      }

      const dataItem = await datasetService.getDataItemById(dataItemId, datasetId, workspaceId)

      if (!dataItem) {
        return reply.status(404).send({ error: 'Data item not found' })
      }

      return reply.send({ dataItem })
    }
  )

  // PATCH /datasets/:id/items/:itemId - Update a data item (OWNER/ADMIN)
  fastify.patch<{ Params: DataItemParams; Body: UpdateDataItemBody }>(
    '/:id/items/:itemId',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['TYPE1', 'TYPE2'] },
            data: { type: 'object' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: DataItemParams; Body: UpdateDataItemBody }>,
      reply: FastifyReply
    ) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'dataset:item:update')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const userId = request.user.userId
      const datasetId = parseInt(request.params.id, 10)
      const dataItemId = parseInt(request.params.itemId, 10)

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: 'Invalid dataset ID' })
      }

      if (isNaN(dataItemId)) {
        return reply.status(400).send({ error: 'Invalid data item ID' })
      }

      const result = await datasetService.updateDataItem(
        dataItemId,
        datasetId,
        workspaceId,
        request.body,
        userId
      )

      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.send({ dataItem: result.dataItem })
    }
  )

  // DELETE /datasets/:id/items/:itemId - Delete a data item (OWNER only)
  fastify.delete<{ Params: DataItemParams }>(
    '/:id/items/:itemId',
    async (request: FastifyRequest<{ Params: DataItemParams }>, reply: FastifyReply) => {
      // RBAC check
      try {
        assertPermission(request.workspace.role, 'dataset:item:delete')
      } catch (err) {
        return reply.status(403).send({ error: (err as Error).message })
      }

      const workspaceId = request.workspace.id
      const datasetId = parseInt(request.params.id, 10)
      const dataItemId = parseInt(request.params.itemId, 10)

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: 'Invalid dataset ID' })
      }

      if (isNaN(dataItemId)) {
        return reply.status(400).send({ error: 'Invalid data item ID' })
      }

      const result = await datasetService.deleteDataItem(dataItemId, datasetId, workspaceId)

      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.status(204).send()
    }
  )
}
