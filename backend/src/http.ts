import type { IncomingMessage, ServerResponse } from 'node:http'
import { protectedDatabase } from './protectedDatabase.js'

export type RequestWithBody = IncomingMessage & {
  body?: unknown
}

export function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(data))
}

export function readJson(req: IncomingMessage, maxBytes = 5_000_000) {
  return new Promise<unknown>((resolve, reject) => {
    const requestWithBody = req as RequestWithBody
    if (requestWithBody.body !== undefined) {
      const serialized =
        typeof requestWithBody.body === 'string'
          ? requestWithBody.body
          : JSON.stringify(requestWithBody.body)
      if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
        reject(new Error('payload too large'))
        return
      }
      resolve(
        typeof requestWithBody.body === 'string'
          ? JSON.parse(serialized)
          : requestWithBody.body,
      )
      return
    }

    const chunks: Buffer[] = []
    let receivedBytes = 0
    let exceededLimit = false
    req.on('data', (chunk) => {
      if (exceededLimit) return
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      receivedBytes += buffer.length
      if (receivedBytes > maxBytes) {
        exceededLimit = true
        reject(new Error('payload too large'))
        return
      }
      chunks.push(buffer)
    })
    req.on('end', () => {
      if (exceededLimit) return
      const body = Buffer.concat(chunks).toString('utf8')
      resolve(body ? JSON.parse(body) : {})
    })
    req.on('error', reject)
  })
}

export function bearerToken(req: IncomingMessage) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new Error('unauthorized')
  }
  return header.slice('Bearer '.length).trim()
}

export function authenticate(req: IncomingMessage) {
  return protectedDatabase.authenticate(bearerToken(req))
}
