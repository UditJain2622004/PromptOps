import { OpenRouterAdapter } from '../src/llm/adapters/openrouter.adapter.ts'
import { SenderRole } from '../src/llm/types.ts'


const adapter = new OpenRouterAdapter()

const res = await adapter.execute({
  model: 'openai/gpt-5-nano',
  messages: [
    { role: SenderRole.User, content: 'Say hello in one sentence.' }
  ],
  promptOpsContext: {
    requestId: 'test',
    workspaceId: 1,
    agentId: 1,
    agentVersionId: 1,
    environment: 'dev',
    mode: 'offline',
    timestamp: Date.now(),
  },
})

console.log(res.choices[0].text)
