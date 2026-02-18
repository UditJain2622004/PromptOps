/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  PROMPTOPS - Offline Evaluation Demo
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Demonstrates the offline evaluation engine:
 *
 *   1. Seeds test data (agent with 2 versions, dataset with 3 items, 2 eval defs)
 *   2. Runs OfflineEvaluationService across all combinations
 *   3. Queries persisted results and prints a per-version breakdown
 *   4. Cleans up all seeded data
 *
 * Run with: npm run test --file=showcase-offline-eval.ts
 *
 * Required env vars: DATABASE_URL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient, Prisma } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { OfflineEvaluationService } from "../src/evaluations/OfflineEvaluationService.ts";
import { GatewayService } from "../src/llm/gateway/gateway.service.ts";
import { OpenRouterAdapter } from "../src/llm/adapters/openrouter.adapter.ts";
import { AgentService } from "../src/services/agent.service.ts";

// ─── Setup ───────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const agentService = new AgentService(prisma);
const gatewayService = new GatewayService(
  new OpenRouterAdapter(),
  agentService,
  { info: () => {}, error: () => {} }, // quiet logger
);
const evalService = new OfflineEvaluationService(prisma, gatewayService);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function divider(title: string) {
  console.log("\n" + "═".repeat(70));
  console.log(`  ${title}`);
  console.log("═".repeat(70));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  divider("OFFLINE EVALUATION DEMO");

  // ── 1. Find a workspace + user to seed under ────────────────────────────

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.log("No workspace found. Create one via the API first.");
    return;
  }
  const userId = workspace.createdById;
  const workspaceId = workspace.id;

  console.log(`\nWorkspace: ${workspace.name} (id: ${workspaceId})`);

  // ── 2. Seed an Agent with two versions ───────────────────────────────────

  divider("SEEDING TEST DATA");

  const agent = await prisma.agent.create({
    data: {
      name: "[Demo] Capital City Agent",
      description: "Answers geography questions about capital cities",
      workspaceId,
      createdById: userId,
      lastUpdatedById: userId,
    },
  });

  // Version 1: concise, factual prompt
  const v1 = await prisma.agentVersion.create({
    data: {
      agentId: agent.id,
      createdById: userId,
      systemInstruction:
        "You are a geography expert. Answer with just the city name, nothing else.",
      config: { model: "openai/gpt-4o-mini", temperature: 0, max_tokens: 10000 },
    },
  });

  // Version 2: verbose, explanatory prompt
  const v2 = await prisma.agentVersion.create({
    data: {
      agentId: agent.id,
      createdById: userId,
      systemInstruction:
        "You are a geography teacher. When asked about a capital city, give the answer and a fun fact about it in one sentence.",
      config: { model: "openai/gpt-4o-mini", temperature: 0.5, max_tokens: 10000 },
    },
  });

  // Activate v1 (doesn't matter for the demo — we pass version ids directly)
  await prisma.agent.update({
    where: { id: agent.id },
    data: { activeAgentVersionId: v1.id },
  });

  console.log(`Agent: ${agent.name} (id: ${agent.id})`);
  console.log(`  Version 1 (concise): id ${v1.id}`);
  console.log(`  Version 2 (verbose): id ${v2.id}`);

  // ── 3. Seed a Dataset with 3 items ──────────────────────────────────────

  const dataset = await prisma.dataset.create({
    data: {
      name: "[Demo] Capital Cities",
      workspaceId,
      createdById: userId,
      lastUpdatedById: userId,
    },
  });

  const items = [
    { input: "What is the capital of France?" },
    { input: "What is the capital of Japan?" },
    { input: "What is the capital of Brazil?" },
  ];

  const dataItems = await Promise.all(
    items.map((data) =>
      prisma.dataItem.create({
        data: { datasetId: dataset.id, data, createdById: userId },
      })
    )
  );

  console.log(`Dataset: ${dataset.name} (id: ${dataset.id}, ${dataItems.length} items)`);

  // ── 4. Seed Evaluation Definitions ──────────────────────────────────────

  const evalDef1 = await prisma.evaluationDefinition.create({
    data: {
      name: "Response min length",
      type: "min_length",
      parameters: { min: 20 },
      definition: {},
      workspaceId,
      createdById: userId,
      lastUpdatedById: userId,
    },
  });

  const evalDef2 = await prisma.evaluationDefinition.create({
    data: {
      name: "No apologies",
      type: "not_contains_text",
      parameters: { text: "sorry" },
      definition: {},
      workspaceId,
      createdById: userId,
      lastUpdatedById: userId,
    },
  });

  console.log(`Eval definitions:`);
  console.log(`  "${evalDef1.name}" (min_length ≥ 2)`);
  console.log(`  "${evalDef2.name}" (not_contains_text "sorry")`);

  // ── 5. Run Offline Evaluation ───────────────────────────────────────────

  divider("RUNNING EVALUATION");

  console.log(
    `\nMatrix: ${2} versions × ${dataItems.length} items × ${2} evals = ${2 * dataItems.length * 2} results expected\n`
  );

  const summary = await evalService.run({
    workspaceId,
    agentVersionIds: [v1.id, v2.id],
    datasetId: dataset.id,
    evaluationDefinitionIds: [evalDef1.id, evalDef2.id],
    triggeredByUserId: userId,
  });

  // ── 6. Print Summary ───────────────────────────────────────────────────

  divider("EVALUATION SUMMARY");

  if (summary.status === "FAILED") {
    console.log(`\nRun FAILED: ${summary.error}`);
  } else {
    const s = summary.summary;
    console.log(`\nRun #${summary.evaluationRunId}  —  ${summary.status}`);
    console.log(`  Agent versions evaluated : ${s.agentVersionsEvaluated}`);
    console.log(`  Data items processed     : ${s.dataItemsProcessed}`);
    console.log(`  Eval definitions applied : ${s.evaluationDefinitionsApplied}`);
    console.log(`  Total results            : ${s.totalResults}`);
    console.log(`  Passed                   : ${s.passed}`);
    console.log(`  Failed                   : ${s.failed}`);
    console.log(`  Failed executions        : ${s.failedExecutions}`);
  }

  // ── 7. Query Persisted Results (per-version breakdown) ──────────────────

  divider("PER-VERSION RESULTS");

  const results = await prisma.evaluationResult.findMany({
    where: { evaluationRunId: summary.evaluationRunId },
    include: {
      evaluationDefinition: { select: { name: true, type: true } },
      agentVersion: { select: { id: true, systemInstruction: true } },
    },
    orderBy: [{ agentVersionId: "asc" }, { evaluationDefinitionId: "asc" }],
  });

  let currentVersionId: number | null = null;

  for (const r of results) {
    if (r.agentVersionId !== currentVersionId) {
      currentVersionId = r.agentVersionId;
      const label = r.agentVersionId === v1.id ? "concise" : "verbose";
      console.log(`\n  Version ${r.agentVersionId} (${label}):`);
    }

    const icon = r.passed ? "✓" : "✗";
    const details = (r.details as Record<string, unknown>)?.message ?? "";
    console.log(
      `    ${icon}  ${r.evaluationDefinition.name ?? r.evaluationDefinition.type}  —  ${details}`
    );
  }

  // ── 8. Cleanup ──────────────────────────────────────────────────────────

  divider("CLEANUP");

  // Cascade deletes handle versions, results, data items
  await prisma.evaluationRun.deleteMany({ where: { id: summary.evaluationRunId } });
  await prisma.evaluationDefinition.deleteMany({ where: { id: { in: [evalDef1.id, evalDef2.id] } } });
  await prisma.dataset.delete({ where: { id: dataset.id } });
  await prisma.agent.delete({ where: { id: agent.id } });

  console.log("\n  Seeded data removed.\n");

  divider("END OF DEMO");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
