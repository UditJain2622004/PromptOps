import { PrismaClient } from "../generated/prisma/client.ts";

interface CaptureProxySampleInput {
  workspaceId: number;
  agentId: number;
  agentVersionId?: number;
  environment: "dev" | "eval" | "prod";
  targetUrl: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseStatusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
  durationMs: number;
}

const HEADER_BLOCKLIST = new Set([
  "authorization",
  "x-promptops-api-key",
  "proxy-authorization",
  "x-api-key",
]);

const BODY_SENSITIVE_KEYS = new Set([
  "api_key",
  "apikey",
  "authorization",
  "password",
  "secret",
  "token",
  "access_token",
  "refresh_token",
]);

export class SampleCaptureService {
  constructor(private readonly prisma: PrismaClient) {}

  async captureProxySample(input: CaptureProxySampleInput): Promise<void> {
    const parsedTarget = new URL(input.targetUrl);
    const model = this.extractModel(input.requestBody);
    const sanitizedRequestHeaders = this.redactHeaders(input.requestHeaders);
    const sanitizedResponseHeaders = this.redactHeaders(input.responseHeaders);
    const sanitizedRequestBody = this.redactBody(input.requestBody);
    const sanitizedResponseBody = this.redactBody(input.responseBody);

    await this.prisma.$executeRaw`
      INSERT INTO "PromptSample" (
        "workspaceId",
        "agentId",
        "agentVersionId",
        "environment",
        "providerHost",
        "targetUrl",
        "method",
        "statusCode",
        "model",
        "latencyMs",
        "requestHeaders",
        "requestBody",
        "responseHeaders",
        "responseBody"
      ) VALUES (
        ${input.workspaceId},
        ${input.agentId},
        ${input.agentVersionId ?? null},
        ${input.environment},
        ${parsedTarget.host},
        ${input.targetUrl},
        ${input.method},
        ${input.responseStatusCode},
        ${model},
        ${Math.max(0, Math.trunc(input.durationMs))},
        ${JSON.stringify(sanitizedRequestHeaders)},
        ${JSON.stringify(sanitizedRequestBody)},
        ${JSON.stringify(sanitizedResponseHeaders)},
        ${JSON.stringify(sanitizedResponseBody)}
      )
    `;
  }

  private redactHeaders(headers: Record<string, string>): Record<string, string> {
    const redacted: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const normalized = key.toLowerCase();
      redacted[key] = HEADER_BLOCKLIST.has(normalized) ? "[REDACTED]" : value;
    }
    return redacted;
  }

  private redactBody(rawBody: string): unknown {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      return this.redactJson(parsed);
    } catch {
      // Non-JSON payloads are kept as-is for replay/debug.
      return rawBody;
    }
  }

  private redactJson(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.redactJson(entry));
    }

    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const redacted: Record<string, unknown> = {};
      for (const [key, entryValue] of Object.entries(obj)) {
        if (BODY_SENSITIVE_KEYS.has(key.toLowerCase())) {
          redacted[key] = "[REDACTED]";
          continue;
        }
        redacted[key] = this.redactJson(entryValue);
      }
      return redacted;
    }

    return value;
  }

  private extractModel(rawBody: string): string | null {
    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      if (typeof parsed.model === "string" && parsed.model.trim()) {
        return parsed.model;
      }
    } catch {
      // non-json input
    }
    return null;
  }

  /**
   * List recent prompt samples for an agent within a workspace.
   * Caller must ensure the agent belongs to the workspace.
   */
  async listSamplesForAgent(
    agentId: number,
    workspaceId: number,
    limit = 20
  ): Promise<
    {
      id: number;
      agentVersionId: number | null;
      environment: string;
      providerHost: string;
      model: string | null;
      statusCode: number;
      latencyMs: number;
      createdAt: Date;
    }[]
  > {
    const samples = await this.prisma.promptSample.findMany({
      where: { agentId, workspaceId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(1, limit), 100),
      select: {
        id: true,
        agentVersionId: true,
        environment: true,
        providerHost: true,
        model: true,
        statusCode: true,
        latencyMs: true,
        createdAt: true,
      },
    });

    return samples;
  }
}

