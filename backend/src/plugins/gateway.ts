import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { GatewayService } from '../llm/gateway/gateway.service.ts'
import { OpenRouterAdapter } from '../llm/adapters/openrouter.adapter.ts'
import { AgentService } from '../services/agent.service.ts'

declare module 'fastify' {
  interface FastifyInstance {
    gateway: GatewayService
  }
}

async function gatewayPlugin(fastify: FastifyInstance) {
  // Ensure prisma is available (db plugin must be registered first)
  if (!fastify.prisma) {
    throw new Error('Gateway plugin requires db plugin to be registered first')
  }

  // Initialize adapter and services
  const adapter = new OpenRouterAdapter()
  const agentService = new AgentService(fastify.prisma)
  const gatewayService = new GatewayService(adapter, agentService)

  // Decorate fastify instance with gateway service
  fastify.decorate('gateway', gatewayService)
}

export default fp(gatewayPlugin, {
  name: 'gateway',
  dependencies: ['prisma'], // Ensures db plugin is loaded first
})
