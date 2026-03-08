/**
 * BaseURL proxy showcase.
 *
 * Run:
 *   npm run test --file=showcase-baseurl-proxy.ts
 *
 * Required env:
 *   PROMPTOPS_PROXY_BASE_URL=http://localhost:3000
 *   PROMPTOPS_PROXY_API_KEY=...
 *   OPENAI_API_KEY=...
 *   PROMPTOPS_AGENT_ID=1
 *   PROMPTOPS_AGENT_VERSION_ID=1
 *   PROMPTOPS_ENVIRONMENT=prod
 *
 * Optional env:
 *   TARGET_PROVIDER_URL=https://api.openai.com/v1/chat/completions
 */

const proxyBaseUrl = process.env.PROMPTOPS_PROXY_BASE_URL ?? "http://localhost:3000";
const proxyApiKey = process.env.PROMPTOPS_PROXY_API_KEY;
const providerApiKey = process.env.OPENAI_API_KEY;

const agentId = process.env.PROMPTOPS_AGENT_ID;
const agentVersionId = process.env.PROMPTOPS_AGENT_VERSION_ID;
const environment = process.env.PROMPTOPS_ENVIRONMENT;
const targetProviderUrl =
  process.env.TARGET_PROVIDER_URL ?? "https://api.openai.com/v1/chat/completions";

if (!proxyApiKey) {
  console.error("Missing PROMPTOPS_PROXY_API_KEY");
  process.exit(1);
}

if (!providerApiKey) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

if (!agentId) {
  console.error("Missing PROMPTOPS_AGENT_ID");
  process.exit(1);
}

if (!agentVersionId) {
  console.error("Missing PROMPTOPS_AGENT_VERSION_ID");
  process.exit(1);
}

if (!environment) {
  console.error("Missing PROMPTOPS_ENVIRONMENT");
  process.exit(1);
}

async function main() {
  const proxiedUrl = `${proxyBaseUrl}/v1/${targetProviderUrl}`;

  console.log("Original provider URL:");
  console.log(`  ${targetProviderUrl}`);
  console.log("Proxied URL:");
  console.log(`  ${proxiedUrl}`);
  console.log("");

  const requestBody = {
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: "Reply with one short sentence about gateways." },
    ],
    temperature: 0.2,
  };

  const response = await fetch(proxiedUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerApiKey}`,
      "Content-Type": "application/json",
      "x-promptops-api-key": proxyApiKey,
      "x-promptops-agent-id": agentId,
      "x-promptops-agent-version-id": agentVersionId,
      "x-promptops-environment": environment,
    },
    body: JSON.stringify(requestBody),
  });

  const rawText = await response.text();

  console.log("Proxy call result:");
  console.log(`  status=${response.status}`);
  console.log(`  content-type=${response.headers.get("content-type") ?? "unknown"}`);
  console.log(`  body=${rawText.slice(0, 500)}${rawText.length > 500 ? "..." : ""}`);
  console.log("");

  // Optional check to demonstrate allowlist enforcement.
  const disallowedUrl = `${proxyBaseUrl}/v1/https://example.com/v1/chat/completions`;
  const disallowedResponse = await fetch(disallowedUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerApiKey}`,
      "Content-Type": "application/json",
      "x-promptops-api-key": proxyApiKey,
      "x-promptops-agent-id": agentId,
      "x-promptops-agent-version-id": agentVersionId,
      "x-promptops-environment": environment,
    },
    body: JSON.stringify(requestBody),
  });

  console.log("Allowlist validation check (expected non-2xx):");
  console.log(`  status=${disallowedResponse.status}`);
  console.log(`  body=${await disallowedResponse.text()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
