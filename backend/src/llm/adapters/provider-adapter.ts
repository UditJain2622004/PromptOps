import { InternalLLMRequest } from '../internal-llm-request.ts';
import { InternalLLMResponse } from '../internal-llm-response.ts';

export interface ProviderAdapter {
  execute(request: InternalLLMRequest): Promise<InternalLLMResponse>;
}
