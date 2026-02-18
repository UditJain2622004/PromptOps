import { Message, SenderRole } from "../types.ts";
import { InternalLLMResponse } from "../internal-llm-response.ts";
import { InternalLLMRequest } from "../internal-llm-request.ts";
import { ProviderAdapter } from "../adapters/provider-adapter.ts";
import { AgentService } from "../../services/agent.service.ts";
import {
  ExecuteAgentInput,
  AgentConfig,
  GatewayError,
  GatewayLogEntry,
} from "../types.ts";

// ─── Logger Interface ───────────────────────────────────────────────────────

export interface GatewayLogger {
  info(entry: GatewayLogEntry): void;
  error(entry: GatewayLogEntry): void;
}

// Default console logger (can be replaced with structured logging)
const defaultLogger: GatewayLogger = {
  info(entry: GatewayLogEntry) {
    console.log(JSON.stringify({ level: "info", ...entry }));
  },
  error(entry: GatewayLogEntry) {
    console.error(JSON.stringify({ level: "error", ...entry }));
  },
};

// ─── Gateway Service ────────────────────────────────────────────────────────

export class GatewayService {
  private readonly logger: GatewayLogger;

  constructor(
    private readonly adapter: ProviderAdapter,
    private readonly agentService: AgentService,
    logger?: GatewayLogger
  ) {
    this.logger = logger ?? defaultLogger;
  }

  async executeAgent(input: ExecuteAgentInput): Promise<InternalLLMResponse> {
    const startTime = Date.now();
    let requestId = crypto.randomUUID();
    let agentVersionId: number | undefined;
    let model: string | undefined;

    // Initialize log entry
    const logEntry: Partial<GatewayLogEntry> = {
      timestamp: startTime,
      requestId,
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      messageCount: input.inputMessages.length,
      hasSystemMessage: input.inputMessages.some(
        (m) => m.role === SenderRole.System
      ),
    };

    try {
      // Step 1: Resolve agent version
      const agentVersion = await this.agentService.getAgentVersion(
        input.agentId,
        input.workspaceId,
        input.agentVersionId
      );

      if (!agentVersion) {
        throw new GatewayError(
          `Agent version not found for agent ${input.agentId}`,
          input.agentVersionId ? "VERSION_NOT_FOUND" : "AGENT_NOT_FOUND",
          {
            agentId: input.agentId,
            agentVersionId: input.agentVersionId,
            workspaceId: input.workspaceId,
          }
        );
      }

      agentVersionId = agentVersion.id;
      logEntry.agentVersionId = agentVersionId;

      // Step 2: Build InternalLLMRequest
      const agentVersionConfig = agentVersion.config as AgentConfig;
      model =
        input.overrides?.model ?? agentVersionConfig?.model ?? "gpt-4o-mini";

      logEntry.model = model;

      const internalLLMRequest: InternalLLMRequest = {
        model,
        messages: [
          { role: SenderRole.System, content: agentVersion.systemInstruction },
          ...input.inputMessages,
        ],
        temperature:
          input.overrides?.temperature ?? agentVersionConfig?.temperature,
        topP: input.overrides?.topP ?? agentVersionConfig?.top_p,
        maxTokens: input.overrides?.maxTokens ?? agentVersionConfig?.max_tokens,

        promptOpsContext: {
          requestId,
          workspaceId: input.workspaceId,
          agentId: input.agentId,
          agentVersionId: agentVersion.id,
          environment: "dev",
          mode: "offline",
          timestamp: startTime,
        },
      };

      // Step 3: Call adapter with enhanced error handling
      let response: InternalLLMResponse;
      try {
        response = await this.adapter.execute(internalLLMRequest);
        // console.log("Output:", JSON.stringify(response, null, 2));

      } catch (adapterError) {
        // Wrap adapter errors with gateway context
        throw new GatewayError(
          `Provider request failed: ${adapterError instanceof Error ? adapterError.message : "Unknown error"}`,
          "PROVIDER_ERROR",
          {
            agentId: input.agentId,
            agentVersionId,
            workspaceId: input.workspaceId,
            requestId,
            model,
            provider: "openrouter", // TODO: make dynamic when supporting multiple providers
          },
          adapterError instanceof Error ? adapterError : undefined
        );
      }

      // Step 4: Log successful response
      const durationMs = Date.now() - startTime;
      this.logger.info({
        ...logEntry,
        agentVersionId: agentVersionId!,
        model: model!,
        durationMs,
        success: true,
        promptTokens: response.usage?.promptTokens,
        completionTokens: response.usage?.completionTokens,
        totalTokens: response.usage?.totalTokens,
        finishReason: response.choices[0]?.finishReason,
      } as GatewayLogEntry);

      return response;
    } catch (error) {
      // Log error
      const durationMs = Date.now() - startTime;
      const isGatewayError = error instanceof GatewayError;

      this.logger.error({
        ...logEntry,
        agentVersionId: agentVersionId ?? 0,
        model: model ?? "unknown",
        durationMs,
        success: false,
        errorCode: isGatewayError ? error.code : "ADAPTER_ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      } as GatewayLogEntry);

      // Re-throw the error (already a GatewayError or wrap it)
      if (isGatewayError) {
        throw error;
      }

      throw new GatewayError(
        error instanceof Error ? error.message : "Unknown gateway error",
        "ADAPTER_ERROR",
        {
          agentId: input.agentId,
          agentVersionId,
          workspaceId: input.workspaceId,
          requestId,
        },
        error instanceof Error ? error : undefined
      );
    }
  }
}
