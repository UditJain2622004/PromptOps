/**
 * Real-agent integration demo with Gemini SDK.
 *
 * Goal: mimic user integration where only baseURL and extra headers are added.
 *
 * Run:
 *   npm run test --file=showcase-real-agent-gemini.ts
 *
 * Required env:
 *   GEMINI_API_KEY=...
 *   PROMPTOPS_PROXY_BASE_URL=http://localhost:3000
 *   PROMPTOPS_PROXY_API_KEY=...
 *   PROMPTOPS_AGENT_ID=1
 *   PROMPTOPS_AGENT_VERSION_ID=1
 *   PROMPTOPS_ENVIRONMENT=prod
 *
 * Optional env:
 *   GEMINI_MODEL=gemini-2.5-flash
 */

import { GoogleGenAI } from "@google/genai";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

const providerKey = requireEnv("GEMINI_API_KEY");
const proxyBaseUrl = requireEnv("PROMPTOPS_PROXY_BASE_URL");
const proxyApiKey = requireEnv("PROMPTOPS_PROXY_API_KEY");
const agentId = requireEnv("PROMPTOPS_AGENT_ID");
const agentVersionId = requireEnv("PROMPTOPS_AGENT_VERSION_ID");
const environment = requireEnv("PROMPTOPS_ENVIRONMENT");
const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const prompt = "Give one concise line about why API gateways are useful.";

async function callDirectGemini() {
  const ai = new GoogleGenAI({ apiKey: providerKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text ?? "";
}

async function callViaPromptOpsProxy() {
  const ai = new GoogleGenAI({
    apiKey: providerKey,
    httpOptions: {
      baseUrl: `${proxyBaseUrl}/v1/https://generativelanguage.googleapis.com`,
      headers: {
        "x-promptops-api-key": proxyApiKey,
        "x-promptops-agent-id": agentId,
        "x-promptops-agent-version-id": agentVersionId,
        "x-promptops-environment": environment,
      },
    },
  });

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text ?? "";
}

async function main() {
  console.log("Gemini real-agent integration demo");
  console.log(`Model: ${model}`);
  console.log("");
  console.log("1) Direct provider call...");
  const direct = await callDirectGemini();
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

