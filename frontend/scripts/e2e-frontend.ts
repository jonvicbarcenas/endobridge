import { createServer } from 'vite'

process.env.VITE_API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:3100'

const server = await createServer({
  configFile: 'frontend/vite.config.ts',
  server: {
    host: '127.0.0.1',
    port: 5174,
  },
})

await server.listen()
server.printUrls()
