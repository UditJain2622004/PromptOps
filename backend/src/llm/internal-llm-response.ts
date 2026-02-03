
export interface InternalLLMResponse {
  model: string;

  choices: {
    index: number;
    role: 'assistant';
    text: string;
    finishReason?: string;
  }[];
  
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  raw?: unknown; // optional, provider-specific passthrough
}
