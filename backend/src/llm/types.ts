// ─── Message Types ──────────────────────────────────────────────────────────

export enum SenderRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
  Tool = 'tool',
}

export enum ToolChoice {
  Auto = 'auto',
  None = 'none',
  Name = 'name',
}

export type MultimodalContentPart = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
};

export type MessageContent = string | MultimodalContentPart[];

export interface Message {
  role: SenderRole;
  content: MessageContent;
  name?: string;
}

// ─── Gateway Input Types ────────────────────────────────────────────────────

export interface ExecuteAgentInput {
  agentId: number;
  agentVersionId?: number;
  workspaceId: number;
  inputMessages: Message[];
  overrides?: AgentOverrides;
  executionContext?: {
    mode?: 'offline' | 'integrated' | 'production';
    environment?: 'dev' | 'eval' | 'prod';
  };
}

export interface ExecuteProxyInput {
  targetUrl: string;
  method: 'POST';
  rawBody: string;
  forwardHeaders: Record<string, string>;
  promptOps: {
    workspaceId: number;
    agentId: number;
    agentVersionId: number;
    environment: 'dev' | 'eval' | 'prod';
  };
}

export interface AgentOverrides {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  model?: string;
}

// ─── Agent Configuration ────────────────────────────────────────────────────

export interface AgentConfig {
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  // extensible for future config options
}

// ─── Gateway Errors ─────────────────────────────────────────────────────────

export class GatewayError extends Error {
  constructor(
    message: string,
    public readonly code: GatewayErrorCode,
    public readonly context?: GatewayErrorContext,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GatewayError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GatewayError);
    }
  }
}

export type GatewayErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'VERSION_NOT_FOUND'
  | 'PROVIDER_ERROR'
  | 'ADAPTER_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT_ERROR';

export interface GatewayErrorContext {
  agentId?: number;
  agentVersionId?: number;
  workspaceId?: number;
  requestId?: string;
  model?: string;
  provider?: string;
}

// ─── Logging Types ──────────────────────────────────────────────────────────

export interface GatewayLogEntry {
  timestamp: number;
  requestId: string;
  workspaceId: number;
  agentId: number;
  agentVersionId: number;
  model: string;
  
  // Request info
  messageCount: number;
  hasSystemMessage: boolean;
  
  // Response info (optional - only populated after response)
  durationMs?: number;
  success?: boolean;
  errorCode?: GatewayErrorCode;
  errorMessage?: string;
  
  // Usage info (optional - only if provider returns it)
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  finishReason?: string;
}