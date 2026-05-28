import type { IncomingMessage, ServerResponse } from 'node:http'
import appHandler from '../backend/api/app.js'
import insightHandler from '../backend/api/generate-insight.js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if ((req.url ?? '').startsWith('/api/generate-insight')) {
    await insightHandler(req, res)
    return
  }

  await appHandler(req, res)
}
