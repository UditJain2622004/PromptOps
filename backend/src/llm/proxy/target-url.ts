const DEFAULT_ALLOWED_PROXY_HOSTS = [
  "api.openai.com",
  "openrouter.ai",
  "generativelanguage.googleapis.com",
  "api.anthropic.com",
];

export class ProxyTargetUrlError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "ProxyTargetUrlError";
  }
}

export function parseAndValidateProxyTargetUrl(
  rawTargetUrl: string,
  rawQueryString?: string
): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawTargetUrl);
  } catch {
    throw new ProxyTargetUrlError("Invalid target URL", 400);
  }

  if (parsed.protocol !== "https:") {
    throw new ProxyTargetUrlError("Only HTTPS target URLs are allowed", 400);
  }

  const allowedHosts = getAllowedProxyHosts();
  if (!isHostAllowed(parsed.hostname, allowedHosts)) {
    throw new ProxyTargetUrlError("Target host is not allowlisted", 403);
  }

  if (rawQueryString) {
    const incomingParams = new URLSearchParams(rawQueryString);
    for (const [key, value] of incomingParams.entries()) {
      parsed.searchParams.append(key, value);
    }
  }

  return parsed;
}

function getAllowedProxyHosts(): string[] {
  const configured = process.env.PROMPTOPS_PROXY_HOST_ALLOWLIST;
  if (!configured) return DEFAULT_ALLOWED_PROXY_HOSTS;

  return configured
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isHostAllowed(hostname: string, allowedHosts: string[]): boolean {
  const normalizedHost = hostname.toLowerCase();
  return allowedHosts.some((allowed) => {
    if (allowed.startsWith(".")) {
      return normalizedHost.endsWith(allowed);
    }
    return normalizedHost === allowed;
  });
}
