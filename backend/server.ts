import './src/env'
import { createServer } from 'node:http'
import appHandler from './api/app'
import insightHandler from './api/generate-insight'

const port = Number(process.env.PORT ?? 3000)
const allowedOrigin = process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:5173'
const storageMode =
  process.env.MONGODB_URI && process.env.ENDOBRIDGE_DATABASE_DRIVER !== 'file'
    ? 'MongoDB'
    : 'local file'

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if ((req.url ?? '').startsWith('/api/generate-insight')) {
    await insightHandler(req, res)
    return
  }

  if ((req.url ?? '').startsWith('/api/')) {
    await appHandler(req, res)
    return
  }

  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'not found' }))
})

server.listen(port, '127.0.0.1', () => {
  console.log(`EndoBridge backend listening on http://127.0.0.1:${port}`)
  console.log(`Protected database storage: ${storageMode}`)
})
