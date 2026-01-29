import Fastify from 'fastify'
import dbPlugin from './plugins/db.js'
import jwtPlugin from './plugins/jwt.js'
import authPlugin from './plugins/auth.js'
import { authRoutes } from './routes/auth.routes.js'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  // Health check (no auth required)
  app.get('/health', () => {
    return { status: 'ok' }
  })

  // Plugins (order matters: db first, then jwt, then auth)
  await app.register(dbPlugin)
  await app.register(jwtPlugin)
  await app.register(authPlugin)

  // Routes
  await app.register(authRoutes, { prefix: '/auth' })

  return app
}