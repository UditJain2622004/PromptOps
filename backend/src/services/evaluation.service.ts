import {
  PrismaClient,
  EvaluationDefinition,
  EvaluationRun,
  EvaluationDefinitionScope,
  Prisma,
} from '../generated/prisma/client.ts'

// ─── Input Types ────────────────────────────────────────────────────────────

export interface CreateDefinitionInput {
  name?: string
  scope: EvaluationDefinitionScope
  agentId?: number
  type: string
  parameters: Prisma.InputJsonValue
  definition: Prisma.InputJsonValue
}

export interface UpdateDefinitionInput {
  name?: string
  scope?: EvaluationDefinitionScope
  agentId?: number | null
  type?: string
  parameters?: Prisma.InputJsonValue
  definition?: Prisma.InputJsonValue
}

export interface CreateRunInput {
  name?: string
  configSnapshot: Prisma.InputJsonValue
}

// ─── Service ────────────────────────────────────────────────────────────────

export class EvaluationService {
  constructor(private prisma: PrismaClient) {}

  // ─── EvaluationDefinition ─────────────────────────────────────────────────

  async createDefinition(
    input: CreateDefinitionInput,
    workspaceId: number,
    userId: number
  ): Promise<{ success: true; definition: EvaluationDefinition } | { success: false; error: string }> {
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

    const definition = await this.prisma.evaluationDefinition.create({
      data: {
        name: input.name,
        scope: input.scope,
        agentId: input.agentId,
        type: input.type,
        parameters: input.parameters,
        definition: input.definition,
        workspaceId,
        createdById: userId,
        lastUpdatedById: userId,
      },
    })

    return { success: true, definition }
  }

  async listDefinitions(workspaceId: number): Promise<EvaluationDefinition[]> {
    return this.prisma.evaluationDefinition.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getDefinitionById(
    definitionId: number,
    workspaceId: number
  ): Promise<EvaluationDefinition | null> {
    return this.prisma.evaluationDefinition.findFirst({
      where: { id: definitionId, workspaceId },
    })
  }

  async updateDefinition(
    definitionId: number,
    workspaceId: number,
    input: UpdateDefinitionInput,
    userId: number
  ): Promise<{ success: true; definition: EvaluationDefinition } | { success: false; error: string }> {
    // Verify definition exists and belongs to workspace
    const existing = await this.prisma.evaluationDefinition.findFirst({
      where: { id: definitionId, workspaceId },
    })

    if (!existing) {
      return { success: false, error: 'Evaluation definition not found' }
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

    const definition = await this.prisma.evaluationDefinition.update({
      where: { id: definitionId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.scope !== undefined && { scope: input.scope }),
        ...(input.agentId !== undefined && { agentId: input.agentId }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.parameters !== undefined && { parameters: input.parameters }),
        ...(input.definition !== undefined && { definition: input.definition }),
        lastUpdatedById: userId,
      },
    })

    return { success: true, definition }
  }

  async deleteDefinition(
    definitionId: number,
    workspaceId: number
  ): Promise<{ success: true } | { success: false; error: string }> {
    // Verify definition exists and belongs to workspace
    const existing = await this.prisma.evaluationDefinition.findFirst({
      where: { id: definitionId, workspaceId },
    })

    if (!existing) {
      return { success: false, error: 'Evaluation definition not found' }
    }

    // Delete definition
    await this.prisma.evaluationDefinition.delete({
      where: { id: definitionId },
    })

    return { success: true }
  }

  // ─── EvaluationRun ────────────────────────────────────────────────────────

  async createRun(
    input: CreateRunInput,
    workspaceId: number,
    userId: number
  ): Promise<EvaluationRun> {
    // Just store the run with status = CREATED
    // No validation of configSnapshot contents (execution will happen later)
    return this.prisma.evaluationRun.create({
      data: {
        name: input.name,
        configSnapshot: input.configSnapshot,
        status: 'CREATED',
        workspaceId,
        createdById: userId,
      },
    })
  }

  async getRunSummary(
    runId: number,
    workspaceId: number
  ): Promise<{
    run: EvaluationRun
    summary: {
      totalResults: number
      passed: number
      failed: number
      passRate: number
    }
    perVersion: {
      agentVersionId: number
      total: number
      passed: number
      failed: number
      passRate: number
    }[]
  } | null> {
    const run = await this.prisma.evaluationRun.findFirst({
      where: { id: runId, workspaceId },
    })
    if (!run) return null

    const [totalResults, passedResults, resultsByVersion] = await Promise.all([
      this.prisma.evaluationResult.count({
        where: { evaluationRunId: runId },
      }),
      this.prisma.evaluationResult.count({
        where: { evaluationRunId: runId, passed: true },
      }),
      this.prisma.evaluationResult.groupBy({
        by: ['agentVersionId'],
        where: { evaluationRunId: runId },
        _count: { id: true },
      }),
    ])

    const failedResults = totalResults - passedResults
    const passRate = totalResults > 0 ? passedResults / totalResults : 0

    const versionIds = resultsByVersion.map((g) => g.agentVersionId)
    const passedByVersion = await this.prisma.evaluationResult.groupBy({
      by: ['agentVersionId'],
      where: { evaluationRunId: runId, passed: true },
      _count: { id: true },
    })
    const passedMap = new Map(passedByVersion.map((g) => [g.agentVersionId, g._count.id]))
    const totalMap = new Map(resultsByVersion.map((g) => [g.agentVersionId, g._count.id]))

    const perVersion = versionIds.map((agentVersionId) => {
      const total = totalMap.get(agentVersionId) ?? 0
      const passed = passedMap.get(agentVersionId) ?? 0
      return {
        agentVersionId,
        total,
        passed,
        failed: total - passed,
        passRate: total > 0 ? passed / total : 0,
      }
    })

    return {
      run,
      summary: {
        totalResults,
        passed: passedResults,
        failed: failedResults,
        passRate,
      },
      perVersion,
    }
  }

  async listRuns(workspaceId: number): Promise<EvaluationRun[]> {
    return this.prisma.evaluationRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async listRunResults(
    runId: number,
    workspaceId: number,
    agentVersionId?: number
  ): Promise<{
    run: EvaluationRun
      results: {
      id: number
      agentVersionId: number
      dataItemId: number | null
      outputText: string | null
      passed: boolean
      details: Prisma.JsonValue | null
      createdAt: Date
      evaluationDefinition: {
        id: number
        name: string | null
        type: string
        parameters: Prisma.JsonValue
        definition: Prisma.JsonValue
      }
      dataItem: {
        id: number
        data: Prisma.JsonValue
      } | null
      agentVersion: {
        id: number
        systemInstruction: string
        config: Prisma.JsonValue
        createdAt: Date
      }
    }[]
  } | null> {
    const run = await this.prisma.evaluationRun.findFirst({
      where: { id: runId, workspaceId },
    })
    if (!run) return null

    const results = await this.prisma.evaluationResult.findMany({
      where: {
        evaluationRunId: runId,
        ...(agentVersionId !== undefined ? { agentVersionId } : {}),
      },
      select: {
        id: true,
        agentVersionId: true,
        dataItemId: true,
        outputText: true,
        passed: true,
        details: true,
        createdAt: true,
        evaluationDefinition: {
          select: {
            id: true,
            name: true,
            type: true,
            parameters: true,
            definition: true,
          },
        },
        dataItem: {
          select: {
            id: true,
            data: true,
          },
        },
        agentVersion: {
          select: {
            id: true,
            systemInstruction: true,
            config: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ agentVersionId: 'asc' }, { evaluationDefinitionId: 'asc' }, { id: 'asc' }],
    })

    return { run, results }
  }
}
