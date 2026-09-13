import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHash } from 'node:crypto'
import {
  GeminiApiError,
  UnsafeGeminiOutputError,
  callGemini,
  parseGeminiReport,
  callGeminiForDailyLogSummary,
  validateSynthesisPayload,
} from './generate-insight.js'
import { authenticate, bearerToken, readJson, sendJson } from '../src/http.js'
import { scanLabDocument } from '../src/labDocumentScanner.js'
import {
  MonitoringValidationError,
  validateCredentialsRequest,
  validateMonitoringRecord,
  validateReportRequest,
  validateScanRequest,
  validateTermsRequest,
} from '../src/monitoringSchemas.js'
import { dataRecordId, isMonitoringCollection, protectedDatabase } from '../src/protectedDatabase.js'
import { scoreSession } from '../../frontend/src/engines/scoringEngine.js'
import type { DailyLogRecord, LabDocumentRecord } from '../../frontend/src/types/monitoring.js'
import type { LabSession } from '../../frontend/src/types/session.js'
import type { SymptomEntry } from '../../frontend/src/types/session.js'

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

class RateLimitExceededError extends Error {}

function requestClientKey(req: IncomingMessage) {
  const forwardedFor = req.headers['x-forwarded-for']
  const address = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0].trim() || req.socket.remoteAddress || 'anonymous'
  return createHash('sha256').update(address).digest('hex')
}

async function enforceRateLimit(key: string, action: string, maxRequests: number, windowMs: number) {
  const allowed = await protectedDatabase.consumeRateLimit(key, action, maxRequests, windowMs)
  if (!allowed) throw new RateLimitExceededError('too many requests')
}

function pathParts(req: IncomingMessage): string[] {
  const query = (req as { query?: Record<string, string | string[]> }).query
  if (query?.path) {
    const rawPath = query.path
    const parts = Array.isArray(rawPath) ? rawPath : rawPath.split('/')
    const filtered = parts.flatMap((p) => p.split('/')).filter(Boolean)
    if (filtered.length > 0 && filtered[0] !== '[...path]') return filtered
  }

  const matchedPath = req.headers['x-matched-path'] ?? req.headers['x-forwarded-uri']
  if (typeof matchedPath === 'string' && matchedPath.startsWith('/api/')) {
    const parts = matchedPath.replace(/^\/api\/?/, '').split('?')[0].split('/').filter(Boolean)
    if (parts.length > 0 && parts[0] !== '[...path]') return parts
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  const searchPathParams = url.searchParams.getAll('path')
  if (searchPathParams.length > 0) {
    const filtered = searchPathParams.flatMap((p) => p.split('/')).filter(Boolean)
    if (filtered.length > 0 && filtered[0] !== '[...path]') return filtered
  }

  const pathname = url.pathname.replace(/^\/api\/?/, '')
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length > 0 && parts[0] !== '[...path]') {
    return parts
  }

  return []
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
      const body = validateCredentialsRequest(await readJson(req))
      await enforceRateLimit(requestClientKey(req), 'register', 5, 60 * 60 * 1000)
      const user = await protectedDatabase.createUser(body.email, body.password)
      sendJson(res, 201, { user })
      return
    }

    if (scope === 'auth' && action === 'login') {
      requirePost(req)
      const body = validateCredentialsRequest(await readJson(req))
      const loginKey = createHash('sha256')
        .update(`${requestClientKey(req)}:${body.email.trim().toLowerCase()}`)
        .digest('hex')
      await enforceRateLimit(loginKey, 'login', 10, 15 * 60 * 1000)
      sendJson(res, 200, await protectedDatabase.createSession(body.email, body.password))
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

    if (scope === 'auth' && action === 'logout') {
      requirePost(req)
      await protectedDatabase.revokeSession(bearerToken(req))
      sendJson(res, 200, { loggedOut: true })
      return
    }

    if (scope === 'terms' && action === 'accept') {
      requirePost(req)
      sendJson(res, 201, await protectedDatabase.acceptTerms(user.userId, validateTermsRequest(await readJson(req))))
      return
    }

    if (scope === 'lab-documents' && action === 'scan') {
      requirePost(req)
      if (!(await protectedDatabase.hasAcceptedTerms(user.userId))) {
        sendJson(res, 403, { error: 'terms acceptance required' })
        return
      }
      await enforceRateLimit(user.userId, 'lab-document-scan', 3, 60_000)
      const body = validateScanRequest(await readJson(req, 8_000_000))
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
      await enforceRateLimit(user.userId, 'report-generation', 5, 60_000)

      const { sessionId } = validateReportRequest(await readJson(req))
      const sessionRecord = (await protectedDatabase.list('labSessions', user.userId)).find(
        (record) => record.id === sessionId,
      )
      if (!sessionRecord) {
        sendJson(res, 404, { error: 'session not found' })
        return
      }

      const [sessionRecords, symptomRecords, dailyLogRecords, labDocumentRecords] = await Promise.all([
        protectedDatabase.list('labSessions', user.userId),
        protectedDatabase.list('symptoms', user.userId),
        protectedDatabase.list('dailyLogs', user.userId),
        protectedDatabase.list('labDocuments', user.userId),
      ])
      const session = validateMonitoringRecord('labSessions', sessionRecord.data) as LabSession
      const scoredSynthesis = scoreSession(session, {
        sessions: sessionRecords.map((record) => validateMonitoringRecord('labSessions', record.data) as LabSession),
        symptoms: symptomRecords.map((record) => validateMonitoringRecord('symptoms', record.data) as SymptomEntry),
        dailyLogs: dailyLogRecords.map((record) => validateMonitoringRecord('dailyLogs', record.data) as DailyLogRecord),
        labDocuments: labDocumentRecords.map(
          (record) => validateMonitoringRecord('labDocuments', record.data) as LabDocumentRecord,
        ),
      })
      const { synthesis } = validateSynthesisPayload({ synthesis: scoredSynthesis })
      const rawReport = await callGemini(synthesis)
      const report = parseGeminiReport(rawReport, synthesis)
      const updatedSession: LabSession = { ...session, insightReport: report }
      await protectedDatabase.update('labSessions', user.userId, sessionId, updatedSession)
      await protectedDatabase.create('reports', user.userId, {
        reportId: `report-${sessionId}`,
        sessionId,
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
        const data = validateMonitoringRecord(collectionName, await readJson(req))
        if (collectionName === 'labSessions' && hasNonNullInsightReport(data)) {
          sendJson(res, 403, { error: 'insight reports must be generated through the validated report endpoint' })
          return
        }
        if (collectionName === 'dailyLogs') {
          try {
            const canGenerateSummary = await protectedDatabase.consumeRateLimit(
              user.userId,
              'daily-log-summary',
              10,
              60_000,
            )
            const summary = canGenerateSummary
              ? await callGeminiForDailyLogSummary(data as Record<string, unknown>)
              : null
            if (summary && data && typeof data === 'object') {
              ;(data as Record<string, unknown>).plainLanguage = summary
            }
          } catch (error) {
            console.error('[dailyLogs summary generation failed]', error)
          }
        }
        sendJson(res, 201, await protectedDatabase.create(collectionName, user.userId, data))
        return
      }

      if ((req.method === 'PUT' || req.method === 'PATCH') && recordId) {
        const data = validateMonitoringRecord(collectionName, await readJson(req))
        if (dataRecordId(data) !== recordId) {
          sendJson(res, 400, { error: 'record id does not match request path' })
          return
        }
        if (collectionName === 'labSessions' && hasNonNullInsightReport(data)) {
          sendJson(res, 403, { error: 'insight reports must be generated through the validated report endpoint' })
          return
        }
        if (collectionName === 'dailyLogs') {
          try {
            const canGenerateSummary = await protectedDatabase.consumeRateLimit(
              user.userId,
              'daily-log-summary',
              10,
              60_000,
            )
            const summary = canGenerateSummary
              ? await callGeminiForDailyLogSummary(data as Record<string, unknown>)
              : null
            if (summary && data && typeof data === 'object') {
              ;(data as Record<string, unknown>).plainLanguage = summary
            }
          } catch (error) {
            console.error('[dailyLogs summary generation failed]', error)
          }
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
    if (message === 'payload too large' || message === 'lab document exceeds size limit') {
      sendJson(res, 413, { error: 'payload too large' })
      return
    }
    if (error instanceof RateLimitExceededError) {
      sendJson(res, 429, { error: 'too many requests' })
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
    if (error instanceof MonitoringValidationError) {
      sendJson(res, 400, { error: error.message })
      return
    }
    if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: 'invalid JSON request' })
      return
    }
    if (
      message === 'invalid lab document payload' ||
      message === 'unsupported lab document type' ||
      message === 'lab document content does not match its declared type' ||
      message === 'invalid DOCX archive' ||
      message === 'DOCX document text exceeds size limit'
    ) {
      sendJson(res, 400, { error: 'invalid lab document' })
      return
    }
    if (message === 'account already exists') {
      sendJson(res, 409, { error: 'account already exists' })
      return
    }
    if (message === 'invalid email or password') {
      sendJson(res, 401, { error: 'invalid email or password' })
      return
    }
    if (message === 'record not found') {
      sendJson(res, 404, { error: 'record not found' })
      return
    }
    if (
      message === 'terms acceptance incomplete' ||
      message === 'a valid email and an 8-128 character password are required'
    ) {
      sendJson(res, 400, { error: message })
      return
    }
    if (message.includes('MONGODB_URI is required')) {
      console.error('[api request failed: database configuration]', message)
      sendJson(res, 500, { error: message })
      return
    }
    console.error('[api request failed]', error instanceof Error ? error.stack || error.message : error)
    sendJson(res, 500, { error: 'request failed' })
  }
}
