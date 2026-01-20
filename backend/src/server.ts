// src/server.ts
import { buildApp } from './app'

const PORT = Number(process.env.PORT) || 3000


const start = async () => {
  try {
    const app = await buildApp()

    await app.listen({
      port: PORT,
      host: '0.0.0.0',
    })

    console.log('Server running on http://localhost:3000')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

start()
