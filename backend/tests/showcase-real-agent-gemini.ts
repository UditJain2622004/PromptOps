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


const providerKey = "AIzaSyD0udBouLwAl0VBtpJwMgdwtW_TnWSSr34"
const proxyBaseUrl = "http://127.0.0.1:3000"
const proxyApiKey = "popk_1_-eqU3-3WeB97nXP1Z1x_cgJe6Lh8nJuXb_Bc-aDffeY"
const agentId = "19"
const agentVersionId = "30"
const environment = "dev"
const model = "gemini-2.5-flash";

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

