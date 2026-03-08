import Fastify from 'fastify'
import dbPlugin from './plugins/db.js'
import jwtPlugin from './plugins/jwt.js'
import authPlugin from './plugins/auth.js'
import workspacePlugin from './plugins/workspace.js'
import gatewayPlugin from './plugins/gateway.js'
import proxyAuthPlugin from './plugins/proxy-auth.js'
import promptOpsHeadersPlugin from './plugins/promptops-headers.js'
import { authRoutes } from './routes/auth.routes.js'
import { workspacesRoutes } from './routes/workspaces.routes.js'
import { agentsRoutes } from './routes/agents.routes.js'
import { evaluationRoutes } from './routes/evaluation.routes.js'
import { datasetRoutes } from './routes/dataset.routes.js'
import { gatewayRoutes } from './routes/gateway.routes.js'
import { proxyRoutes } from './routes/proxy.routes.js'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  // Health check (no auth required)
  app.get('/health', () => {
    return { status: 'ok' }
  })

  // Plugins (order matters: db first, then gateway, then jwt, then auth)
  await app.register(dbPlugin)
  await app.register(gatewayPlugin)  // Depends on db plugin
  await app.register(jwtPlugin)
  await app.register(authPlugin)

  // Public routes (no auth)
  await app.register(authRoutes, { prefix: '/auth' })

  // BaseURL proxy routes (proxy API key + PromptOps metadata headers)
  await app.register(async function proxyScopedRoutes(proxyApp) {
    await proxyApp.register(proxyAuthPlugin)
    await proxyApp.register(promptOpsHeadersPlugin)
    await proxyApp.register(proxyRoutes)
  }, { prefix: '/v1' })

  // Workspace routes (auth required, but no workspace resolution)
  await app.register(workspacesRoutes, { prefix: '/workspaces' })

  // Workspace-scoped routes (auth + workspace resolution required)
  // All future domain routes (agents, evaluations, datasets) go here
  await app.register(async function workspaceScopedRoutes(scopedApp) {
    // Register workspace resolution plugin for this scope only
    await scopedApp.register(workspacePlugin)

    // Domain routes
    await scopedApp.register(agentsRoutes, { prefix: '/agents' })
    await scopedApp.register(evaluationRoutes)
    await scopedApp.register(datasetRoutes, { prefix: '/datasets' })
    await scopedApp.register(gatewayRoutes, { prefix: '/gateway' })
  }, { prefix: '/workspaces/:workspaceId' })

  return app
}