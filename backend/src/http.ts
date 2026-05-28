import type { IncomingMessage, ServerResponse } from 'node:http'
import { protectedDatabase } from './protectedDatabase'

export type RequestWithBody = IncomingMessage & {
  body?: unknown
}

export function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export function readJson(req: IncomingMessage, maxBytes = 5_000_000) {
  return new Promise<unknown>((resolve, reject) => {
    const requestWithBody = req as RequestWithBody
    if (requestWithBody.body !== undefined) {
      resolve(
        typeof requestWithBody.body === 'string'
          ? JSON.parse(requestWithBody.body)
          : requestWithBody.body,
      )
      return
    }

    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > maxBytes) reject(new Error('payload too large'))
    })
    req.on('end', () => resolve(body ? JSON.parse(body) : {}))
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
