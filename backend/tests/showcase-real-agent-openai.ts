/**
 * Real-agent integration demo with OpenAI SDK.
 *
 * Goal: mimic user integration where only baseURL and extra headers are added.
 *
 * Run:
 *   npm run test --file=showcase-real-agent-openai.ts
 *
 * Required env:
 *   OPENAI_API_KEY=...
 *   PROMPTOPS_PROXY_BASE_URL=http://localhost:3000
 *   PROMPTOPS_PROXY_API_KEY=...
 *   PROMPTOPS_AGENT_ID=1
 *   PROMPTOPS_AGENT_VERSION_ID=1
 *   PROMPTOPS_ENVIRONMENT=prod
 *
 * Optional env:
 *   OPENAI_MODEL=gpt-4o-mini
 */

import OpenAI from "openai";

const providerKey = process.env.OPENAI_API_KEY;
const proxyBaseUrl = process.env.PROMPTOPS_PROXY_BASE_URL;
const proxyApiKey = process.env.PROMPTOPS_PROXY_API_KEY;
const agentId = process.env.PROMPTOPS_AGENT_ID;
const agentVersionId = process.env.PROMPTOPS_AGENT_VERSION_ID;
const environment = process.env.PROMPTOPS_ENVIRONMENT;
const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

if (!providerKey) throw new Error("Missing OPENAI_API_KEY");
if (!proxyBaseUrl) throw new Error("Missing PROMPTOPS_PROXY_BASE_URL");
if (!proxyApiKey) throw new Error("Missing PROMPTOPS_PROXY_API_KEY");
if (!agentId) throw new Error("Missing PROMPTOPS_AGENT_ID");
if (!agentVersionId) throw new Error("Missing PROMPTOPS_AGENT_VERSION_ID");
if (!environment) throw new Error("Missing PROMPTOPS_ENVIRONMENT");

const prompt = "Give one concise line about why API gateways are useful.";

async function callDirectOpenAI() {
  const client = new OpenAI({ apiKey: providerKey });
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });
  return response.choices[0]?.message?.content ?? "";
}

async function callViaPromptOpsProxy() {
  const client = new OpenAI({
    apiKey: providerKey,
    baseURL: `${proxyBaseUrl}/v1/https://api.openai.com/v1`,
    defaultHeaders: {
      "x-promptops-api-key": proxyApiKey,
      "x-promptops-agent-id": agentId,
      "x-promptops-agent-version-id": agentVersionId,
      "x-promptops-environment": environment,
    },
  });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });
  return response.choices[0]?.message?.content ?? "";
}

async function main() {
  console.log("OpenAI real-agent integration demo");
  console.log(`Model: ${model}`);
  console.log("");
  console.log("1) Direct provider call...");
  const direct = await callDirectOpenAI();
  console.log(`Direct: ${direct}`);
  console.log("");
  console.log("2) PromptOps proxied call (baseURL + headers)...");
  const proxied = await callViaPromptOpsProxy();
  console.log(`Proxied: ${proxied}`);
  console.log("");
  console.log("Integration diff:");
  console.log("  - Same SDK call payload");
  console.log("  - Only baseURL + PromptOps headers added");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

