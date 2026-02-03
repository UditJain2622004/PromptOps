import "dotenv/config";

import { ProviderAdapter } from "./provider-adapter.ts";
import { InternalLLMRequest } from "../internal-llm-request.ts";
import { InternalLLMResponse } from "../internal-llm-response.ts";


type OpenRouterChatCompletionResponse = {
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason?: string;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};



export class OpenRouterAdapter implements ProviderAdapter {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor() {
    const key = process.env.OPENROUTER_API_KEY
    const baseUrl = process.env.OPENROUTER_BASE_URL
    if (!key) {
      throw new Error('OPENROUTER_API_KEY is not set')
    }
    if (!baseUrl) {
      throw new Error('OPENROUTER_BASE_URL is not set')
    }
    this.apiKey = key
    this.baseUrl = baseUrl
  }

  async execute(request: InternalLLMRequest): Promise<InternalLLMResponse> {
    const url = `${this.baseUrl}/chat/completions`

    const body = {
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
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        // optional but recommended by OpenRouter
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'PromptOps',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `OpenRouter request failed (${response.status}): ${errorText}`
      )
    }

    const data = (await response.json()) as OpenRouterChatCompletionResponse

    const internalResponse: InternalLLMResponse = {
        model: data.model ?? request.model,

        choices: data.choices.map((choice, index) => ({
            index,
            role: 'assistant',
            text: choice.message?.content ?? '',
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
    }

    return internalResponse
  }
}
