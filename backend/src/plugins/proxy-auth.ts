import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { ProxyApiKeyService } from "../services/proxy-api-key.service.ts";

function readProxyApiKeyFromHeaders(request: FastifyRequest): string | undefined {
  const promptOpsHeader = request.headers["x-promptops-api-key"];
  if (typeof promptOpsHeader === "string") {
    const normalized = promptOpsHeader.trim();
    return normalized || undefined;
  }
  return undefined;
}

declare module "fastify" {
  interface FastifyRequest {
    proxyAuth: {
      workspaceId: number;
    };
  }
}

async function proxyAuthPlugin(fastify: FastifyInstance) {
  const proxyApiKeyService = new ProxyApiKeyService(fastify.prisma);

  if (!fastify.hasRequestDecorator("proxyAuth")) {
    fastify.decorateRequest("proxyAuth", undefined as unknown as { workspaceId: number });
  }

  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const providedKey = readProxyApiKeyFromHeaders(request);
    if (!providedKey) {
      return reply.status(401).send({ error: "x-promptops-api-key header is required" });
    }

    const result = await proxyApiKeyService.validate(providedKey);
    if (!result.valid) {
      return reply.status(401).send({ error: "Invalid proxy API key" });
    }

    request.proxyAuth = { workspaceId: result.workspaceId };
  });
}

export default fp(proxyAuthPlugin, {
  name: "proxy-auth",
  dependencies: ["prisma"],
});
