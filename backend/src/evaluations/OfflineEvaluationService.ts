/**
 * OfflineEvaluationService - Runs offline evaluations against agent versions.
 */

import { PrismaClient, AgentVersion, DataItem, Prisma } from "../generated/prisma/client.ts";
import { GatewayService } from "../llm/gateway/gateway.service.ts";
import { SenderRole, Message } from "../llm/types.ts";
import { evaluationRegistry } from "./registry.ts";
import { OfflineEvaluationInput, EvaluationRunSummary } from "./types.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Local type for EvaluationDefinition to handle schema/client sync issues.
 * Schema: type String, parameters Json
 */
interface EvaluationDefinitionRecord {
  id: number;
  name: string | null;
  type: string;
  parameters: Record<string, unknown>;
  workspaceId: number;
}

type SuccessfulExecution = {
  agentVersionId: number;
  dataItemId: number;
  outputText: string;
  success: true;
};

type FailedExecution = {
  agentVersionId: number;
  dataItemId: number;
  success: false;
  error: string;
};

type ExecutionResult = SuccessfulExecution | FailedExecution;

// ─── Service ─────────────────────────────────────────────────────────────────

export class OfflineEvaluationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly gatewayService: GatewayService,
  ) {}

  /**
   * Run an offline evaluation across agent versions, dataset items, and evaluation definitions.
   * 
   * Flow:
   * 1. Create EvaluationRun (intent snapshot)
   * 2. Load all required data (agent versions, dataset items, evaluation definitions)
   * 3. For each (agentVersion × datasetItem × evaluationDefinition):
   *    - Execute agent offline via gateway
   *    - Run evaluator
   *    - Persist EvaluationResult
   * 4. Mark run as complete (or failed)
   * 5. Return summary (not raw results)
   */
  async run(input: OfflineEvaluationInput): Promise<EvaluationRunSummary> {
    // 1. Create EvaluationRun (intent snapshot - captures what we're evaluating)
    const evaluationRun = await this.prisma.evaluationRun.create({
      data: {
        workspaceId: input.workspaceId,
        createdById: input.triggeredByUserId,
        status: "RUNNING",
        mode: "CHAT", // Offline evaluation is always CHAT mode for now
        configSnapshot: {
          agentVersionIds: input.agentVersionIds,
          datasetId: input.datasetId,
          evaluationDefinitionIds: input.evaluationDefinitionIds,
        } satisfies Prisma.InputJsonValue,
      },
    });

    const runId = evaluationRun.id;

    try {
      // 2. Load all required data
      const [agentVersions, dataItems, evaluationDefinitions] = await Promise.all([
        this.loadAgentVersions(input.agentVersionIds, input.workspaceId),
        this.loadDataItems(input.datasetId, input.workspaceId),
        this.loadEvaluationDefinitions(input.evaluationDefinitionIds, input.workspaceId),
      ]);

      // Validate we have data to work with
      if (agentVersions.length === 0) {
        throw new Error("No valid agent versions found");
      }
      if (dataItems.length === 0) {
        throw new Error("No data items found in dataset");
      }
      if (evaluationDefinitions.length === 0) {
        throw new Error("No valid evaluation definitions found");
      }

      // 3. Execute and evaluate
      let totalResults = 0;
      let passedResults = 0;
      let failedExecutions = 0;

      for (const agentVersion of agentVersions) {
        for (const dataItem of dataItems) {
          // Execute agent offline
          const executionResult = await this.executeOffline(
            agentVersion,
            dataItem,
            input.workspaceId
          );
          console.log(executionResult)

          if (!executionResult.success) {
            failedExecutions++;
            // Log but continue - we don't want one failure to stop the entire run
            console.error(
              `[OfflineEval] Execution failed for agentVersion=${agentVersion.id}, dataItem=${dataItem.id}: ${executionResult.error}`
            );
            continue;
          }

          // Run each evaluator on the output
          for (const evalDef of evaluationDefinitions) {
            const evaluator = evaluationRegistry[evalDef.type];
            if (!evaluator) {
              // Unknown evaluator type - skip (future-safe)
              console.warn(`[OfflineEval] Unknown evaluator type: ${evalDef.type}`);
              continue;
            }

            const evalResult = evaluator.evaluate(
              { outputText: executionResult.outputText },
              evalDef.parameters
            );

            // Persist result
            await this.prisma.evaluationResult.create({
              data: {
                evaluationRunId: runId,
                evaluationDefinitionId: evalDef.id,
                agentVersionId: agentVersion.id,
                passed: evalResult.passed,
                details: evalResult.details ? { message: evalResult.details } : Prisma.JsonNull,
              },
            });

            totalResults++;
            if (evalResult.passed) passedResults++;
          }
        }
      }

      // 4. Mark run as complete
      await this.prisma.evaluationRun.update({
        where: { id: runId },
        data: { status: "COMPLETED" },
      });

      // 5. Return summary
      return {
        evaluationRunId: runId,
        status: "COMPLETED",
        summary: {
          totalResults,
          passed: passedResults,
          failed: totalResults - passedResults,
          failedExecutions,
          agentVersionsEvaluated: agentVersions.length,
          dataItemsProcessed: dataItems.length,
          evaluationDefinitionsApplied: evaluationDefinitions.length,
        },
      };
    } catch (error) {
      // Mark run as failed
      await this.prisma.evaluationRun.update({
        where: { id: runId },
        data: { status: "FAILED" },
      });

      return {
        evaluationRunId: runId,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ─── Data Loading ──────────────────────────────────────────────────────────

  private async loadAgentVersions(
    agentVersionIds: number[],
    workspaceId: number
  ): Promise<(AgentVersion & { agent: { id: number } })[]> {
    // Load agent versions and verify they belong to agents in this workspace
    const versions = await this.prisma.agentVersion.findMany({
      where: {
        id: { in: agentVersionIds },
        agent: { workspaceId },
      },
      include: { agent: { select: { id: true } } },
    });

    return versions;
  }

  private async loadDataItems(
    datasetId: number,
    workspaceId: number
  ): Promise<DataItem[]> {
    // Verify dataset belongs to workspace, then load items
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId },
    });

    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found in workspace`);
    }

    return this.prisma.dataItem.findMany({
      where: { datasetId },
      orderBy: { id: "asc" },
    });
  }

  private async loadEvaluationDefinitions(
    evaluationDefinitionIds: number[],
    workspaceId: number
  ): Promise<EvaluationDefinitionRecord[]> {
    const definitions = await this.prisma.evaluationDefinition.findMany({
      where: {
        id: { in: evaluationDefinitionIds },
        workspaceId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        parameters: true,
        workspaceId: true,
      },
    });

    return definitions as EvaluationDefinitionRecord[];
  }

  // ─── Offline Execution ─────────────────────────────────────────────────────

  /**
   * Execute an agent version against a dataset item in offline mode.
   * 
   * Key behaviors:
   * - Uses the gateway for consistent execution
   * - Forces mode='offline', environment='eval'
   * - Injects dataset item as user message
   * - Uses agent version's system instruction
   */
  private async executeOffline(
    agentVersion: AgentVersion & { agent: { id: number } },
    dataItem: DataItem,
    workspaceId: number
  ): Promise<ExecutionResult> {
    try {
      // Extract user input from dataset item
      const userInput = this.extractUserInput(dataItem);

      // Build input message
      const inputMessages: Message[] = [
        { role: SenderRole.User, content: userInput },
      ];

      // Execute via gateway (gateway handles system instruction injection)
      const response = await this.gatewayService.executeAgent({
        agentId: agentVersion.agent.id,
        agentVersionId: agentVersion.id,
        workspaceId,
        inputMessages,
        // Note: mode/environment are set inside gateway's promptOpsContext
        // For true offline mode, we'd need to extend ExecuteAgentInput
      });

      const outputText = response.choices[0]?.text ?? "";

      return {
        agentVersionId: agentVersion.id,
        dataItemId: dataItem.id,
        outputText,
        success: true,
      };
    } catch (error) {
      return {
        agentVersionId: agentVersion.id,
        dataItemId: dataItem.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown execution error",
      };
    }
  }

  /**
   * Extract user input from a dataset item.
   * Dataset items store data as JSON - we need to extract the relevant input field.
   */
  private extractUserInput(dataItem: DataItem): string {
    const data = dataItem.data as Record<string, unknown>;

    // Support common field names for user input
    if (typeof data.input === "string") return data.input;
    if (typeof data.prompt === "string") return data.prompt;
    if (typeof data.question === "string") return data.question;
    if (typeof data.message === "string") return data.message;
    if (typeof data.text === "string") return data.text;

    // Fallback: stringify the entire data object
    return JSON.stringify(data);
  }
}
