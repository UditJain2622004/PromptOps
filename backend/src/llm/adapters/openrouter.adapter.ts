import "dotenv/config";

import { ProviderAdapter, AdapterConfig, filterUndefined } from "./provider-adapter.ts";
import { InternalLLMRequest } from "../internal-llm-request.ts";
import { InternalLLMResponse } from "../internal-llm-response.ts";

// ─── OpenRouter API Types ────────────────────────────────────────────────────

/**
 * OpenRouter response can vary by model:
 * - Legacy models: may use `text` field directly on choice
 * - Chat models (GPT-4, Claude, etc.): use `message.content`
 * - GPT-5 models: use `message.content` (never `text`)
 */
interface OpenRouterChoice {
  index: number;
  // Chat Completions format (GPT-4, GPT-5, Claude, etc.)
  message?: {
    role: string;
    content: string | null;
  };
  // Legacy completions format (older models)
  text?: string;
  finish_reason?: string;
}

interface OpenRouterChatCompletionResponse {
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// ─── Adapter Implementation ──────────────────────────────────────────────────

export class OpenRouterAdapter implements ProviderAdapter {
  readonly name = 'openrouter';
  
  private readonly baseUrl: string;
  private readonly apiKey: string;

  /**
   * Create an OpenRouter adapter.
   * @param config - Optional config. If not provided, reads from environment variables.
   */
  constructor(config?: AdapterConfig) {
    if (config) {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl ?? 'https://openrouter.ai/api/v1';
    } else {
      const key = process.env.OPENROUTER_API_KEY;
      const baseUrl = process.env.OPENROUTER_BASE_URL;
      if (!key) {
        throw new Error('OPENROUTER_API_KEY is not set');
      }
      if (!baseUrl) {
        throw new Error('OPENROUTER_BASE_URL is not set');
      }
      this.apiKey = key;
      this.baseUrl = baseUrl;
    }
  }

  async execute(request: InternalLLMRequest): Promise<InternalLLMResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    // Build request body, filtering out undefined values
    const body = filterUndefined({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      top_p: request.topP,
      max_tokens: request.maxTokens,
      stop: request.stopTokens,
      seed: request.seed,
      n: request.numCompletions,
      stream: false,
      // provider passthrough (blind forwarding)
      ...(request.providerConfig ?? {}),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'PromptOps',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[${this.name}] Request failed (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as OpenRouterChatCompletionResponse;

    // Normalize response - handle both Chat Completions and legacy formats
    return {
      model: data.model ?? request.model,
      choices: (data.choices ?? []).map((choice, index) => ({
        index,
        role: 'assistant' as const,
        text: this.extractContent(choice),
        finishReason: choice.finish_reason,
      })),
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      raw: data,
    };
  }

  /**
   * Extract text content from a choice, handling different response formats:
   * - Chat Completions (GPT-4, GPT-5, Claude): choice.message.content
   * - Legacy Completions: choice.text
   */
  private extractContent(choice: OpenRouterChoice): string {
    // Chat Completions format (preferred, used by GPT-5, GPT-4, Claude, etc.)
    if (choice.message?.content != null) {
      return choice.message.content;
    }

    // Legacy text field (older completion models)
    if (choice.text != null) {
      return choice.text;
    }

    return '';
  }
}
