import { SenderRole, ToolChoice, MultimodalContentPart, MessageContent, Message } from './types.ts';


/**
 If PromptOps logic needs to understand, reason about, or depend on a field → it goes at the top level.
 If PromptOps just passes it through blindly → it goes under a provider-scoped bucket.
 */
export interface InternalLLMRequest {
  // --- core input ---
  model: string;
  messages: Message[];

  // --- generation config (minimal common set) ---
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopTokens?: string | string[];
  seed?: number;

  // --- execution flags ---
  stream?: boolean;
  numCompletions?: number;

  // --- PromptOps metadata (VERY IMPORTANT) ---
  promptOpsContext: {
    requestId: string;

    workspaceId: number;
    agentId: number;
    agentVersionId: number;

    environment: 'dev' | 'eval' | 'prod';
    mode: 'offline' | 'integrated' | 'production';

    timestamp: number;
  };

  // ---- Provider-specific passthrough (optional) ----
  providerConfig?: {
    metadata?: Record<string, unknown>;
    responseFormat?: unknown;
    tools?: unknown;
    toolChoice?: ToolChoice;
    parallelToolCalls?: boolean;
    safetySettings?: unknown;
    user?: string;
  };
}

















// interface InternalRequest {
//     model: string
//     messages: string | Array<Message>

//     systemInstructions?: string

    
//     temperature?: number
//     topP?: number
//     topK?: number
//     maxTokens?: number
//     minTokens?: number
//     logProbs?: boolean //** */
//     logitBias?: Record<string, number> //** */
//     topLogprobs?: number
//     frequencyPenalty?: number
//     repetitionPenalty?: number
//     presencePenalty?: number
//     store?: boolean   //Whether to store the output for distillation/evals.
    
//     reasoningEffort?: JSON
//     responseFormat?: JSON
//     responseMimeType?: string
//     tools?: JSON  //** */
//     toolChoice?: ToolChoice //** */
//     parallelToolCalls?: boolean

//     conversation_id?: string
    
//     stopTokens?: string |string[]
    
    
//     stream?: boolean
//     numCompletions?: number  // number of completions to return
//     echo?: boolean   // include the prompt/messages in the returned text. 
//     safetySettings?: JSON //** */
//     metadata?: JSON //** */
//     contentFilter?: JSON //** */
//     cachedContent?: string

//     seed?: number
//     bestOf?: number
//     user?: string //** */
//     sampling_params?: JSON //** */
//     truncateBy?: string
//     temperatureDecay?: number
//     includeUsage?: boolean
// }