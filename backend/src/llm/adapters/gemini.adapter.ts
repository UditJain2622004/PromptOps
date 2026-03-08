import "dotenv/config";

import { ProviderAdapter, AdapterConfig, filterUndefined } from "./provider-adapter.ts";
import { InternalLLMRequest, InternalLLMProxyRequest } from "../internal-llm-request.ts";
import { InternalLLMResponse, InternalProxyResponse } from "../internal-llm-response.ts";
import { SenderRole } from "../types.ts";

// ─── Gemini API Types ────────────────────────────────────────────────────────

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiGenerateContentRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: unknown;
}

interface GeminiGenerateContentResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason?: string;
    index?: number;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  modelVersion?: string;
}

// ─── Adapter Implementation ──────────────────────────────────────────────────

export class GeminiAdapter implements ProviderAdapter {
  readonly name = 'gemini';

  private readonly apiKey: string;
  private readonly baseUrl: string;

  /**
   * Create a Gemini adapter.
   * @param config - Optional config. If not provided, reads from environment variables.
   */
  constructor(config?: AdapterConfig) {
    if (config) {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    } else {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error('GEMINI_API_KEY is not set');
      }
      this.apiKey = key;
      this.baseUrl = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta';
    }
  }

  async execute(request: InternalLLMRequest): Promise<InternalLLMResponse> {
    // Extract model name (handle formats like "gemini-1.5-flash" or "models/gemini-1.5-flash")
    const modelName = request.model.startsWith('models/')
      ? request.model
      : `models/${request.model}`;

    const url = `${this.baseUrl}/${modelName}:generateContent?key=${this.apiKey}`;

    // Convert messages to Gemini format
    const { systemInstruction, contents } = this.convertMessages(request.messages);

    // Build generation config
    const generationConfig = filterUndefined({
      temperature: request.temperature,
      topP: request.topP,
      maxOutputTokens: request.maxTokens,
      stopSequences: Array.isArray(request.stopTokens)
        ? request.stopTokens
        : request.stopTokens
          ? [request.stopTokens]
          : undefined,
    });

    const body: GeminiGenerateContentRequest = {
      contents,
      ...(systemInstruction && { systemInstruction }),
      ...(Object.keys(generationConfig).length > 0 && { generationConfig }),
      ...(request.providerConfig?.safetySettings
        ? { safetySettings: request.providerConfig.safetySettings }
        : {}),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[${this.name}] Request failed (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;

    // Defensive parsing with fallbacks
    const candidates = data.candidates ?? [];

    return {
      model: data.modelVersion ?? request.model,
      choices: candidates.map((candidate, index) => ({
        index: candidate.index ?? index,
        role: 'assistant' as const,
        text: candidate.content?.parts?.map(p => p.text).join('') ?? '',
        finishReason: candidate.finishReason,
      })),
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      raw: data,
    };
  }

  async proxyExecute(request: InternalLLMProxyRequest): Promise<InternalProxyResponse> {
    const { targetUrl, method, rawBody, forwardHeaders } = request.proxyTransport;

    const response = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: rawBody,
    });

    return {
      statusCode: response.status,
      headers: this.headersToRecord(response.headers),
      rawBody: await response.text(),
    };
  }

  private headersToRecord(headers: Headers): Record<string, string> {
    const record: Record<string, string> = {};
    for (const [key, value] of headers.entries()) {
      record[key] = value;
    }
    return record;
  }

  /**
   * Convert internal message format to Gemini's format.
   * Gemini uses 'user' and 'model' roles, and system instructions are separate.
   */
  private convertMessages(messages: InternalLLMRequest['messages']): {
    systemInstruction?: { parts: { text: string }[] };
    contents: GeminiContent[];
  } {
    let systemInstruction: { parts: { text: string }[] } | undefined;
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
      const textContent = typeof msg.content === 'string'
        ? msg.content
        : msg.content.map(part => part.text ?? '').join('');

      if (msg.role === SenderRole.System) {
        // Gemini handles system instructions separately
        systemInstruction = { parts: [{ text: textContent }] };
      } else if (msg.role === SenderRole.User) {
        contents.push({ role: 'user', parts: [{ text: textContent }] });
      } else if (msg.role === SenderRole.Assistant) {
        contents.push({ role: 'model', parts: [{ text: textContent }] });
      }
      // Tool messages would need special handling for function calling
    }

    return { systemInstruction, contents };
  }
}
