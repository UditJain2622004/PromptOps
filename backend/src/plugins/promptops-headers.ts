import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export interface PromptOpsProxyHeadersContext {
  agentId: number;
  agentVersionId: number;
  environment: "dev" | "eval" | "prod";
}

declare module "fastify" {
  interface FastifyRequest {
    promptops: PromptOpsProxyHeadersContext;
  }
}

async function promptOpsHeadersPlugin(fastify: FastifyInstance) {
  if (!fastify.hasRequestDecorator("promptops")) {
    fastify.decorateRequest(
      "promptops",
      undefined as unknown as PromptOpsProxyHeadersContext
    );
  }

  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const agentIdHeader = request.headers["x-promptops-agent-id"];
    const agentVersionIdHeader = request.headers["x-promptops-agent-version-id"];
    const environmentHeader = request.headers["x-promptops-environment"];
    const agentIdRaw = typeof agentIdHeader === "string" ? agentIdHeader.trim() : "";

    const agentId = Number.parseInt(agentIdRaw, 10);
    if (!Number.isFinite(agentId) || agentId <= 0) {
      return reply
        .status(400)
        .send({ error: "x-promptops-agent-id must be a positive integer" });
    }

    const agentVersionIdRaw =
      typeof agentVersionIdHeader === "string" ? agentVersionIdHeader.trim() : "";
    const agentVersionId = Number.parseInt(agentVersionIdRaw, 10);
    if (!Number.isFinite(agentVersionId) || agentVersionId <= 0) {
      return reply.status(400).send({
        error: "x-promptops-agent-version-id must be a positive integer",
      });
    }

    if (typeof environmentHeader !== "string" || !environmentHeader.trim()) {
      return reply.status(400).send({
        error: "x-promptops-environment header is required",
      });
    }
    const normalized = environmentHeader.trim().toLowerCase();
    if (normalized !== "dev" && normalized !== "eval" && normalized !== "prod") {
      return reply.status(400).send({
        error: "x-promptops-environment must be one of: dev, eval, prod",
      });
    }
    const environment = normalized;

    request.promptops = {
      agentId,
      agentVersionId,
      environment,
    };
  });
}

export default fp(promptOpsHeadersPlugin, {
  name: "promptops-headers",
  dependencies: ["proxy-auth"],
});
