/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  PROMPTOPS - Gateway & Adapter Pattern Showcase
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This script demonstrates how easy it is to integrate the PromptOps Gateway
 * into any client code, using different LLM providers via the adapter pattern.
 *
 * Run with: npm run test --file=showcase-adapters.ts
 *
 * Required env vars:
 *   - DATABASE_URL (for Prisma)
 *   - OPENROUTER_API_KEY + OPENROUTER_BASE_URL (for OpenRouter)
 *   - GEMINI_API_KEY (for Gemini)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { GatewayService } from "../src/llm/gateway/gateway.service.ts";
import { OpenRouterAdapter } from "../src/llm/adapters/openrouter.adapter.ts";
import { GeminiAdapter } from "../src/llm/adapters/gemini.adapter.ts";
import { AgentService } from "../src/services/agent.service.ts";
import { SenderRole } from "../src/llm/types.ts";

// ─── Setup ───────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const agentService = new AgentService(prisma);

// Quiet logger for cleaner output
const quietLogger = {
  info: () => {},
  error: () => {},
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function divider(title: string) {
  console.log("\n" + "═".repeat(70));
  console.log(`  ${title}`);
  console.log("═".repeat(70) + "\n");
}

// ─── Main Demo ───────────────────────────────────────────────────────────────

async function main() {
  divider("PROMPTOPS GATEWAY SHOWCASE");

  // Step 1: Find or create a test workspace and agent
  console.log("Setting up test data...\n");

  let workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.log("No workspace found. Please create one first via the API.");
    return;
  }

  let agent = await prisma.agent.findFirst({
    where: { workspaceId: workspace.id },
  });
  // let agent = null;

  if (!agent) {
    console.log("No agent found. Creating a test agent...");
    agent = await prisma.agent.create({
      data: {
        name: "Showcase Agent2",
        description: "Demo agent for gateway showcase",
        workspaceId: workspace.id,
        createdById: 1,
        lastUpdatedById: 1,
      },
    });
  }

  // Ensure we have an active version
  if (!agent.activeAgentVersionId) {
    console.log("Creating agent version...");
    const version = await prisma.agentVersion.create({
      data: {
        agentId: agent.id,
        systemInstruction: "You are a helpful assistant. Be concise and direct.",
        config: { temperature: 0.7, max_tokens: 100000 },
        createdById: 1,
      },
    });
    await prisma.agent.update({
      where: { id: agent.id },
      data: { activeAgentVersionId: version.id },
    });
    agent.activeAgentVersionId = version.id;
  }

  console.log(`Using workspace: ${workspace.name} (id: ${workspace.id})`);
  console.log(`Using agent: ${agent.name} (id: ${agent.id})`);

  // ─── Demo 1: OpenRouter Gateway ────────────────────────────────────────────

  divider("1. GATEWAY WITH OPENROUTER ADAPTER");

  if (process.env.OPENROUTER_API_KEY) {
    // Create gateway with OpenRouter adapter - that's it!
    const openRouterGateway = new GatewayService(
      new OpenRouterAdapter(),
      agentService,
      quietLogger
    );

    console.log("Executing agent via OpenRouter...\n");
    const startTime = Date.now();

    try {
      const response = await openRouterGateway.executeAgent({
        agentId: agent.id,
        workspaceId: workspace.id,
        inputMessages: [
          { role: SenderRole.User, content: "Briefly explain how does LLM API Gateways work?" },
        ],
        overrides: { model: "openai/gpt-4o-mini" },
      });

      console.log(`Model:    ${response.model}`);
      console.log(`Output:   ${response.choices[0]?.text}`);
      console.log(`Tokens:   ${response.usage?.totalTokens ?? "N/A"}`);
      console.log(`Duration: ${Date.now() - startTime}ms`);
    } catch (err) {
      console.log(`Error: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.log("Skipped: OPENROUTER_API_KEY not set");
  }

  // ─── Demo 2: Gemini Gateway ────────────────────────────────────────────────

  divider("2. GATEWAY WITH GEMINI ADAPTER");

  if (process.env.GEMINI_API_KEY) {
    // Swap adapter - same gateway interface!
    const geminiGateway = new GatewayService(
      new GeminiAdapter(),
      agentService,
      quietLogger
    );

    console.log("Executing agent via Gemini...\n");
    const startTime = Date.now();

    try {
      const response = await geminiGateway.executeAgent({
        agentId: agent.id,
        workspaceId: workspace.id,
        inputMessages: [
          { role: SenderRole.User, content: "explain how does LLM API Gateways work?" },
        ],
        overrides: { model: "gemini-2.0-flash" },
      });

      console.log(`Model:    ${response.model}`);
      console.log(`Output:   ${response.choices[0]?.text}`);
      console.log(`Tokens:   ${response.usage?.totalTokens ?? "N/A"}`);
      console.log(`Duration: ${Date.now() - startTime}ms`);
    } catch (err) {
      console.log(`Error: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.log("Skipped: GEMINI_API_KEY not set");
  }


  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
