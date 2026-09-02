import { Readable } from 'node:stream'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLabSession } from '../../frontend/src/models/labSession'
import { validateLabSessionInput } from '../../frontend/src/engines/validationEngine'
import type { LabSessionInput } from '../../frontend/src/types/session'

vi.hoisted(() => {
  process.env.ENDOBRIDGE_DATABASE_DRIVER = 'file'
  process.env.ENDOBRIDGE_DATABASE_PATH = 'backend/data/app-handler.test.json'
})

vi.mock('./generate-insight', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./generate-insight')>()
  return {
    ...actual,
    callGemini: vi.fn().mockResolvedValue(
      JSON.stringify({
        observationalSummary: 'Submitted values showed an above-range LDL-C result.',
        observations: ['LDL-C was above the configured reference range.'],
        observationReasons: ['This may reflect the submitted LDL-C measurement.'],
      }),
    ),
  }
})

import handler from './app'
import { callGemini } from './generate-insight'
import { protectedDatabase } from '../src/protectedDatabase'

const input: LabSessionInput = {
  age: 28,
  biomarkers: {
    ldlC: { value: 180, unit: 'mg/dL' },
    fastingGlucose: { value: 96, unit: 'mg/dL' },
    fastingInsulin: { value: 15, unit: 'uIU/mL' },
    totalTestosterone: { value: 54, unit: 'ng/dL' },
    amh: { value: 5, unit: 'ng/mL' },
    lhFshRatio: { value: 1.7, unit: 'ratio' },
    dheas: { value: 320, unit: 'ug/dL' },
  },
}

async function apiRequest(method: string, url: string, body: unknown, token: string) {
  const request = Readable.from([JSON.stringify(body)]) as IncomingMessage
  request.method = method
  request.url = url
  request.headers = { authorization: `Bearer ${token}` }

  let responseBody = ''
  const response = {
    statusCode: 200,
    setHeader: vi.fn(),
    end(value?: string) {
      responseBody = value ?? ''
    },
  } as unknown as ServerResponse

  await handler(request, response)
  return { status: response.statusCode, body: JSON.parse(responseBody) as Record<string, unknown> }
}

describe('report API trust boundary', () => {
  beforeEach(() => {
    vi.mocked(callGemini).mockClear()
  })

  it('rejects client synthesis and generates a persisted report from the stored session', async () => {
    const email = `report-${randomUUID()}@example.com`
    await protectedDatabase.createUser(email, 'password-4')
    const auth = await protectedDatabase.createSession(email, 'password-4')
    await protectedDatabase.acceptTerms(auth.user.userId, {
      acceptedTerms: true,
      acceptedPrivacy: true,
      confirmedAge: true,
      acceptedDisclaimer: true,
    })
    const session = createLabSession(input, validateLabSessionInput(input))
    await protectedDatabase.create('labSessions', auth.user.userId, session)

    const forged = await apiRequest(
      'POST',
      '/api/reports/generate',
      { sessionId: session.sessionId, synthesis: { flaggedBiomarkers: [] } },
      auth.token,
    )
    expect(forged.status).toBe(400)
    expect(callGemini).not.toHaveBeenCalled()

    const legitimate = await apiRequest(
      'POST',
      '/api/reports/generate',
      { sessionId: session.sessionId },
      auth.token,
    )
    expect(legitimate).toEqual({ status: 200, body: expect.any(Object) })
    expect(callGemini).toHaveBeenCalledOnce()

    const storedSession = (await protectedDatabase.list('labSessions', auth.user.userId))[0]
    expect(storedSession.data).toEqual(expect.objectContaining({ insightReport: legitimate.body }))
    await expect(protectedDatabase.list('reports', auth.user.userId)).resolves.toHaveLength(1)
  })
})
