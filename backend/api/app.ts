import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  GeminiApiError,
  UnsafeGeminiOutputError,
  callGemini,
  parseGeminiReport,
  validateSynthesisPayload,
} from './generate-insight.js'
import { authenticate, readJson, sendJson } from '../src/http.js'
import { scanLabDocument } from '../src/labDocumentScanner.js'
import { isMonitoringCollection, protectedDatabase } from '../src/protectedDatabase.js'
import type { LabSession } from '../../frontend/src/types/session.js'

const collectionByPath = new Map<string, string>([
  ['lab-sessions', 'labSessions'],
  ['questionnaire-responses', 'questionnaireResponses'],
  ['symptoms', 'symptoms'],
  ['medications', 'medications'],
  ['medication-reminders', 'medicationReminders'],
  ['medication-adherence', 'medicationAdherence'],
  ['daily-logs', 'dailyLogs'],
  ['cycle-logs', 'cycleLogs'],
  ['reports', 'reports'],
  ['lab-documents', 'labDocuments'],
])

function pathParts(req: IncomingMessage) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  return url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
}

function requirePost(req: IncomingMessage) {
  if (req.method !== 'POST') throw new Error('method not allowed')
}

function hasNonNullInsightReport(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  if (!('insightReport' in data)) return false
  return (data as { insightReport?: unknown }).insightReport !== null
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const parts = pathParts(req)
    const [scope, action] = parts

    if (scope === 'health') {
      sendJson(res, 200, { ok: true })
      return
    }

    if (scope === 'auth' && action === 'register') {
      requirePost(req)
      const body = (await readJson(req)) as { email?: string; password?: string }
      const user = await protectedDatabase.createUser(body.email ?? '', body.password ?? '')
      sendJson(res, 201, { user })
      return
    }

    if (scope === 'auth' && action === 'login') {
      requirePost(req)
      const body = (await readJson(req)) as { email?: string; password?: string }
      sendJson(res, 200, await protectedDatabase.createSession(body.email ?? '', body.password ?? ''))
      return
    }

    const user = await authenticate(req)

    if (scope === 'auth' && action === 'me') {
      sendJson(
        res,
        200,
        await protectedDatabase.sessionProfile(req.headers.authorization?.replace('Bearer ', '') ?? ''),
      )
      return
    }

    if (scope === 'terms' && action === 'accept') {
      requirePost(req)
      sendJson(res, 201, await protectedDatabase.acceptTerms(user.userId, (await readJson(req)) as object))
      return
    }

    if (scope === 'lab-documents' && action === 'scan') {
      requirePost(req)
      if (!(await protectedDatabase.hasAcceptedTerms(user.userId))) {
        sendJson(res, 403, { error: 'terms acceptance required' })
        return
      }
      const body = (await readJson(req, 8_000_000)) as { dataUrl?: string }
      if (!body.dataUrl) {
        sendJson(res, 400, { error: 'PDF payload is required' })
        return
      }
      sendJson(res, 200, await scanLabDocument(body.dataUrl))
      return
    }

    if (scope === 'account' && action === 'data-delete') {
      requirePost(req)
      const body = (await readJson(req)) as { deletedDataType?: string }
      const deletedDataType = body.deletedDataType ?? 'all'
      if (deletedDataType !== 'all' && !isMonitoringCollection(deletedDataType)) {
        sendJson(res, 400, { error: 'invalid deletion target' })
        return
      }
      sendJson(res, 200, await protectedDatabase.deleteCollection(user.userId, deletedDataType))
      return
    }

    if (scope === 'reports' && action === 'generate') {
      requirePost(req)
      if (!(await protectedDatabase.hasAcceptedTerms(user.userId))) {
        sendJson(res, 403, { error: 'terms acceptance required' })
        return
      }

      const { synthesis } = validateSynthesisPayload(await readJson(req))
      const sessionRecord = (await protectedDatabase.list('labSessions', user.userId)).find(
        (record) => record.id === synthesis.sessionId,
      )
      if (!sessionRecord) {
        sendJson(res, 404, { error: 'session not found' })
        return
      }

      const rawReport = await callGemini(synthesis)
      const report = parseGeminiReport(rawReport, synthesis)
      const session = sessionRecord.data as LabSession
      const updatedSession: LabSession = { ...session, insightReport: report }
      await protectedDatabase.update('labSessions', user.userId, synthesis.sessionId, updatedSession)
      await protectedDatabase.create('reports', user.userId, {
        reportId: `report-${synthesis.sessionId}`,
        sessionId: synthesis.sessionId,
        generatedAt: report.reportTimestamp,
        report,
        validationStatus: 'validated',
      })
      sendJson(res, 200, report)
      return
    }

    const collectionName = collectionByPath.get(scope ?? '')
    if (collectionName && isMonitoringCollection(collectionName)) {
      if (!(await protectedDatabase.hasAcceptedTerms(user.userId))) {
        sendJson(res, 403, { error: 'terms acceptance required' })
        return
      }

      const recordId = parts[1]

      if (collectionName === 'reports' && req.method !== 'GET' && !(req.method === 'DELETE' && recordId)) {
        sendJson(res, 403, { error: 'reports must be generated through the validated report endpoint' })
        return
      }

      if (req.method === 'GET') {
        sendJson(res, 200, { records: await protectedDatabase.list(collectionName, user.userId) })
        return
      }

      if (req.method === 'POST') {
        const data = await readJson(req)
        if (collectionName === 'labSessions' && hasNonNullInsightReport(data)) {
          sendJson(res, 403, { error: 'insight reports must be generated through the validated report endpoint' })
          return
        }
        sendJson(res, 201, await protectedDatabase.create(collectionName, user.userId, data))
        return
      }

      if ((req.method === 'PUT' || req.method === 'PATCH') && recordId) {
        const data = await readJson(req)
        if (collectionName === 'labSessions' && hasNonNullInsightReport(data)) {
          sendJson(res, 403, { error: 'insight reports must be generated through the validated report endpoint' })
          return
        }
        sendJson(
          res,
          200,
          await protectedDatabase.update(collectionName, user.userId, recordId, data),
        )
        return
      }

      if (req.method === 'DELETE' && recordId) {
        sendJson(res, 200, await protectedDatabase.deleteRecord(collectionName, user.userId, recordId))
        return
      }
    }

    sendJson(res, 404, { error: 'not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'request failed'
    if (message === 'unauthorized') {
      sendJson(res, 401, { error: 'unauthorized' })
      return
    }
    if (message === 'method not allowed') {
      sendJson(res, 405, { error: 'method not allowed' })
      return
    }
    if (message === 'payload too large') {
      sendJson(res, 413, { error: 'payload too large' })
      return
    }
    if (error instanceof UnsafeGeminiOutputError) {
      sendJson(res, 422, { error: 'UNSAFE_OUTPUT_REJECTED' })
      return
    }
    if (error instanceof GeminiApiError) {
      sendJson(res, 503, { error: 'insight generation is temporarily unavailable' })
      return
    }
    sendJson(res, 400, { error: message })
  }
}
