import { InternalLLMRequest } from '../internal-llm-request.ts';
import { InternalLLMResponse } from '../internal-llm-response.ts';

export interface ProviderAdapter {
  /** Unique identifier for this adapter (e.g., 'openrouter', 'gemini') */
  readonly name: string;

  /** Execute an LLM request and return the response */
  execute(request: InternalLLMRequest): Promise<InternalLLMResponse>;
}

/**
 * Configuration for provider adapters.
 * Allows dependency injection for testing and per-workspace config.
 */
export interface AdapterConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Removes undefined values from an object (shallow).
 * Prevents sending `"temperature": undefined` in JSON payloads.
 */
export function filterUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}
