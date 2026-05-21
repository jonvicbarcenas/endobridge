import type { IncomingMessage, ServerResponse } from 'node:http'

const REQUIRED_KEYS = [
  'sessionId',
  'flaggedBiomarkers',
  'topContributors',
  'questionnaireContext',
  'longitudinalSummary',
]

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 16_384) {
        reject(new Error('payload too large'))
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method not allowed' })
    return
  }

  try {
    const body = JSON.parse(await readBody(req))
    const synthesis = body?.synthesis

    if (!synthesis || REQUIRED_KEYS.some((key) => !(key in synthesis))) {
      sendJson(res, 400, { error: 'invalid synthesis payload' })
      return
    }

    if (!process.env.GEMINI_API_KEY) {
      sendJson(res, 503, { error: 'insight generation is not configured' })
      return
    }

    sendJson(res, 501, {
      error: 'Gemini integration boundary is scaffolded; model call is not implemented yet.',
    })
  } catch {
    sendJson(res, 400, { error: 'invalid request' })
  }
}
