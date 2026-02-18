import {
  PrismaClient,
  Dataset,
  DataItem,
  DatasetScope,
  DataItemType,
  Prisma,
} from '../generated/prisma/client.ts'

// ─── Input Types ────────────────────────────────────────────────────────────

export interface CreateDatasetInput {
  name?: string
  scope: DatasetScope
  agentId?: number
}

export interface UpdateDatasetInput {
  name?: string
  scope?: DatasetScope
  agentId?: number | null
}

export interface CreateDataItemInput {
  type?: DataItemType
  data: Prisma.InputJsonValue
}

export interface UpdateDataItemInput {
  type?: DataItemType
  data?: Prisma.InputJsonValue
}

// ─── Service ────────────────────────────────────────────────────────────────

export class DatasetService {
  constructor(private prisma: PrismaClient) {}

  // ─── Dataset CRUD ─────────────────────────────────────────────────────────

  async createDataset(
    input: CreateDatasetInput,
    workspaceId: number,
    userId: number
  ): Promise<{ success: true; dataset: Dataset } | { success: false; error: string }> {
    // If scope is AGENT, verify agentId is provided
    if (input.scope === 'AGENT' && input.agentId === undefined) {
      return { success: false, error: 'Agent ID is required for AGENT scope' }
    }

    // If agentId is provided, verify it belongs to this workspace
    if (input.agentId !== undefined) {
      const agent = await this.prisma.agent.findFirst({
        where: { id: input.agentId, workspaceId },
      })

      if (!agent) {
        return { success: false, error: 'Agent not found in this workspace' }
      }
    }

    const dataset = await this.prisma.dataset.create({
      data: {
        name: input.name,
        scope: input.scope,
        agentId: input.agentId,
        workspaceId,
        createdById: userId,
        lastUpdatedById: userId,
      },
    })

    return { success: true, dataset }
  }

  async listDatasets(workspaceId: number): Promise<Dataset[]> {
    return this.prisma.dataset.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getDatasetById(
    datasetId: number,
    workspaceId: number
  ): Promise<Dataset | null> {
    return this.prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId },
    })
  }

  async updateDataset(
    datasetId: number,
    workspaceId: number,
    input: UpdateDatasetInput,
    userId: number
  ): Promise<{ success: true; dataset: Dataset } | { success: false; error: string }> {
    // Verify dataset exists and belongs to workspace
    const existing = await this.prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId },
    })

    if (!existing) {
      return { success: false, error: 'Dataset not found' }
    }

    // If agentId is being updated, verify it belongs to workspace
    if (input.agentId !== undefined && input.agentId !== null) {
      const agent = await this.prisma.agent.findFirst({
        where: { id: input.agentId, workspaceId },
      })

      if (!agent) {
        return { success: false, error: 'Agent not found in this workspace' }
      }
    }

    const dataset = await this.prisma.dataset.update({
      where: { id: datasetId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.scope !== undefined && { scope: input.scope }),
        ...(input.agentId !== undefined && { agentId: input.agentId }),
        lastUpdatedById: userId,
      },
    })

    return { success: true, dataset }
  }

  async deleteDataset(
    datasetId: number,
    workspaceId: number
  ): Promise<{ success: true } | { success: false; error: string }> {
    // Verify dataset exists and belongs to workspace
    const existing = await this.prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId },
    })

    if (!existing) {
      return { success: false, error: 'Dataset not found' }
    }

    // Delete dataset (cascade will handle DataItems)
    await this.prisma.dataset.delete({
      where: { id: datasetId },
    })

    return { success: true }
  }

  // ─── DataItem CRUD ────────────────────────────────────────────────────────

  async createDataItem(
    datasetId: number,
    workspaceId: number,
    input: CreateDataItemInput,
    userId: number
  ): Promise<{ success: true; dataItem: DataItem } | { success: false; error: string }> {
    // Verify dataset exists and belongs to workspace
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId },
    })

    if (!dataset) {
      return { success: false, error: 'Dataset not found' }
    }

    const dataItem = await this.prisma.dataItem.create({
      data: {
        type: input.type ?? 'TYPE1',
        data: input.data,
        datasetId,
        createdById: userId,
      },
    })

    return { success: true, dataItem }
  }

  async listDataItems(
    datasetId: number,
    workspaceId: number
  ): Promise<DataItem[] | null> {
    // Verify dataset exists and belongs to workspace
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId },
    })

    if (!dataset) {
      return null
    }

    return this.prisma.dataItem.findMany({
      where: { datasetId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getDataItemById(
    dataItemId: number,
    datasetId: number,
    workspaceId: number
  ): Promise<DataItem | null> {
    // Verify dataset exists and belongs to workspace
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId },
    })

    if (!dataset) {
      return null
    }

    return this.prisma.dataItem.findFirst({
      where: { id: dataItemId, datasetId },
    })
  }

  async updateDataItem(
    dataItemId: number,
    datasetId: number,
    workspaceId: number,
    input: UpdateDataItemInput,
    userId: number
  ): Promise<{ success: true; dataItem: DataItem } | { success: false; error: string }> {
    // Verify dataset exists and belongs to workspace
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId },
    })

    if (!dataset) {
      return { success: false, error: 'Dataset not found' }
    }

    // Verify data item exists and belongs to dataset
    const existing = await this.prisma.dataItem.findFirst({
      where: { id: dataItemId, datasetId },
    })

    if (!existing) {
      return { success: false, error: 'Data item not found' }
    }

    const dataItem = await this.prisma.dataItem.update({
      where: { id: dataItemId },
      data: {
        ...(input.type !== undefined && { type: input.type }),
        ...(input.data !== undefined && { data: input.data }),
      },
    })

    return { success: true, dataItem }
  }

  async deleteDataItem(
    dataItemId: number,
    datasetId: number,
    workspaceId: number
  ): Promise<{ success: true } | { success: false; error: string }> {
    // Verify dataset exists and belongs to workspace
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId },
    })

    if (!dataset) {
      return { success: false, error: 'Dataset not found' }
    }

    // Verify data item exists and belongs to dataset
    const existing = await this.prisma.dataItem.findFirst({
      where: { id: dataItemId, datasetId },
    })

    if (!existing) {
      return { success: false, error: 'Data item not found' }
    }

    await this.prisma.dataItem.delete({
      where: { id: dataItemId },
    })

    return { success: true }
  }
}
