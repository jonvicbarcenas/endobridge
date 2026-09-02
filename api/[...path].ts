import type { IncomingMessage, ServerResponse } from 'node:http'
import appHandler from '../backend/api/app.js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await appHandler(req, res)
}
