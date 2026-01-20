import Fastify from 'fastify'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  app.get("/health", (req, res)=>{
    return{
        "status":"Ok"
    }
  })

  // plugins
  // app.register(dbPlugin)
  // app.register(authPlugin)

  // routes
  // app.register(agentRoutes)

  return app
}