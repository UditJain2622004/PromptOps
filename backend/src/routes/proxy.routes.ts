import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { GatewayError } from "../llm/types.js";
import {
  parseAndValidateProxyTargetUrl,
  ProxyTargetUrlError,
} from "../llm/proxy/target-url.js";
import { SampleCaptureService } from "../services/sample-capture.service.js";

interface ProxyParams {
  "*": string;
}

const REQUEST_HEADERS_TO_STRIP = new Set([
  "host",
  "content-length",
  "x-promptops-api-key",
  "x-promptops-agent-id",
  "x-promptops-agent-version-id",
  "x-promptops-environment",
]);

const RESPONSE_HEADERS_TO_STRIP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

function extractRawQueryString(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const queryStart = rawUrl.indexOf("?");
  if (queryStart < 0) return undefined;
  return rawUrl.slice(queryStart + 1);
}

function buildForwardHeaders(
  headers: FastifyRequest["headers"]
): Record<string, string> {
  const forwardHeaders: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(headers)) {
    const key = rawKey.toLowerCase();
    if (REQUEST_HEADERS_TO_STRIP.has(key)) continue;
    if (rawValue === undefined) continue;

    if (Array.isArray(rawValue)) {
      forwardHeaders[key] = rawValue.join(", ");
      continue;
    }

    forwardHeaders[key] = String(rawValue);
  }

  if (!forwardHeaders["content-type"]) {
    forwardHeaders["content-type"] = "application/json";
  }

  return forwardHeaders;
}

function sanitizeResponseHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalized = key.toLowerCase();
    if (RESPONSE_HEADERS_TO_STRIP.has(normalized)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

export async function proxyRoutes(fastify: FastifyInstance) {
  const sampleCaptureService = new SampleCaptureService(fastify.prisma);

  // Keep JSON payload raw so we can forward provider-native bodies untouched.
  if (fastify.hasContentTypeParser("application/json")) {
    fastify.removeContentTypeParser("application/json");
  }

  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      done(null, body);
    }
  );

  fastify.post<{ Params: ProxyParams; Body: string | Record<string, unknown> }>(
    "/*",
    async (
      request: FastifyRequest<{
        Params: ProxyParams;
        Body: string | Record<string, unknown>;
      }>,
      reply: FastifyReply
    ) => {
      const requestStart = Date.now();
      let targetUrl: URL;
      try {
        targetUrl = parseAndValidateProxyTargetUrl(
          request.params["*"],
          extractRawQueryString(request.raw.url)
        );
      } catch (error) {
        if (error instanceof ProxyTargetUrlError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(400).send({ error: "Invalid proxy target URL" });
      }

      const rawBody =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body ?? {});

      try {
        const proxied = await fastify.gateway.executeProxy({
          targetUrl: targetUrl.toString(),
          method: "POST",
          rawBody,
          forwardHeaders: buildForwardHeaders(request.headers),
          promptOps: {
            workspaceId: request.proxyAuth.workspaceId,
            agentId: request.promptops.agentId,
            agentVersionId: request.promptops.agentVersionId,
            environment: request.promptops.environment,
          },
        });

        const responseHeaders = sanitizeResponseHeaders(proxied.headers);
        for (const [key, value] of Object.entries(responseHeaders)) {
          reply.header(key, value);
        }

        void sampleCaptureService
          .captureProxySample({
            workspaceId: request.proxyAuth.workspaceId,
            agentId: request.promptops.agentId,
            agentVersionId: request.promptops.agentVersionId,
            environment: request.promptops.environment,
            targetUrl: targetUrl.toString(),
            method: "POST",
            requestHeaders: buildForwardHeaders(request.headers),
            requestBody: rawBody,
            responseStatusCode: proxied.statusCode,
            responseHeaders: proxied.headers,
            responseBody: proxied.rawBody,
            durationMs: Date.now() - requestStart,
          })
          .catch((captureError) => {
            request.log.error({ err: captureError }, "Prompt sample capture failed");
          });

        return reply.status(proxied.statusCode).send(proxied.rawBody);
      } catch (error) {
        if (error instanceof GatewayError) {
          void sampleCaptureService
            .captureProxySample({
              workspaceId: request.proxyAuth.workspaceId,
              agentId: request.promptops.agentId,
              agentVersionId: request.promptops.agentVersionId,
              environment: request.promptops.environment,
              targetUrl: targetUrl.toString(),
              method: "POST",
              requestHeaders: buildForwardHeaders(request.headers),
              requestBody: rawBody,
              responseStatusCode: 502,
              responseHeaders: { "content-type": "application/json" },
              responseBody: JSON.stringify({
                error: error.message,
                code: error.code,
              }),
              durationMs: Date.now() - requestStart,
            })
            .catch((captureError) => {
              request.log.error({ err: captureError }, "Prompt sample capture failed");
            });

          return reply.status(502).send({
            error: error.message,
            code: error.code,
          });
        }

        request.log.error({ err: error }, "Unhandled proxy error");
        return reply.status(500).send({ error: "Internal proxy error" });
      }
    }
  );
}
