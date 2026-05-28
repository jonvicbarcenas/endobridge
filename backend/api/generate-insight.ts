import type { IncomingMessage, ServerResponse } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { backendReferenceRanges } from '../src/referenceRanges.js'
import type {
  Contributor,
  InsightReport,
  ReportContributor,
  SynthesisOutput,
} from '../../frontend/src/types/insight.js'

const REQUIRED_KEYS: Array<keyof SynthesisOutput> = [
  'sessionId',
  'flaggedBiomarkers',
  'topContributors',
  'questionnaireContext',
  'longitudinalSummary',
]

const ALLOWED_SYNTHESIS_KEYS = new Set(REQUIRED_KEYS)
const DEFAULT_GEMINI_MODEL = 'models/gemini-3.1-flash-lite'
const MAX_OUTPUT_TOKENS = 900
const GEMINI_REQUEST_TIMEOUT_MS = 20_000
const RATE_LIMIT_MAX_REQUESTS = 5
const RATE_LIMIT_WINDOW_MS = 60_000
const UNSAFE_OUTPUT_REJECTED = 'UNSAFE_OUTPUT_REJECTED'
const PROHIBITED_FIELD_PATTERN =
  /^(medication|medications|medId|dosage|scheduleTime|nextReminderAt|lastTakenAt|isActive)$/i
const rateLimitBuckets = new Map<string, number[]>()

class PayloadValidationError extends Error {}

export class UnsafeGeminiOutputError extends Error {
  constructor(message = 'unsafe Gemini output rejected') {
    super(message)
    this.name = 'UnsafeGeminiOutputError'
  }
}

export class GeminiApiError extends Error {}

type RequestWithOptionalBody = IncomingMessage & {
  body?: unknown
}

export interface GeminiHttpResponse {
  ok: boolean
  status: number
  data: unknown
}

export type GeminiTransport = (
  endpoint: URL,
  body: unknown,
  timeoutMs: number,
) => Promise<GeminiHttpResponse>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertNoProhibitedFields(value: unknown) {
  if (Array.isArray(value)) {
    value.forEach(assertNoProhibitedFields)
    return
  }

  if (!isPlainObject(value)) return

  for (const [key, nestedValue] of Object.entries(value)) {
    if (PROHIBITED_FIELD_PATTERN.test(key)) {
      throw new PayloadValidationError(`unexpected field: ${key}`)
    }
    assertNoProhibitedFields(nestedValue)
  }
}

function normalizeModelName(model: string) {
  return model.startsWith('models/') ? model : `models/${model}`
}

function clientKey(req: IncomingMessage) {
  const forwardedFor = req.headers['x-forwarded-for']
  if (Array.isArray(forwardedFor)) return forwardedFor[0] ?? 'anonymous'
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return req.socket.remoteAddress ?? 'anonymous'
}

export function resetRateLimitForTests() {
  rateLimitBuckets.clear()
}

export function isRateLimited(key: string, now = Date.now()) {
  const recent = (rateLimitBuckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp <= RATE_LIMIT_WINDOW_MS,
  )

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitBuckets.set(key, recent)
    return true
  }

  rateLimitBuckets.set(key, [...recent, now])
  return false
}

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('malformed Gemini observations')
  }

  return value
}

function findFlaggedBiomarker(synthesis: SynthesisOutput, contributor: Contributor) {
  return synthesis.flaggedBiomarkers.find((biomarker) => biomarker.key === contributor.key) ?? null
}

function buildReportContributors(synthesis: SynthesisOutput): ReportContributor[] {
  return synthesis.topContributors.map((contributor) => {
    const biomarker = findFlaggedBiomarker(synthesis, contributor)

    if (!biomarker || biomarker.direction === 'normal') {
      throw new Error('malformed contributor payload')
    }

    return {
      ...contributor,
      biomarkerLabel: backendReferenceRanges[contributor.key].label,
      value: biomarker.value,
      unit: biomarker.unit,
      direction: biomarker.direction,
    }
  })
}

function unsafeTextPatterns() {
  return [
    /\bdiagnos(?:e|is|ed|ing)\b/i,
    /\byou have\b/i,
    /\bdoes not have\b/i,
    /\bpositive for\b/i,
    /\bnegative for\b/i,
    /\bprescrib(?:e|ed|ing)\b/i,
    /\btreatment\b/i,
    /\bmedication\b/i,
    /\bmetformin\b/i,
    /\bdosage\b/i,
    /\bconsult (?:a|your) (?:doctor|physician|clinician)\b/i,
  ]
}

export function postJson(
  endpoint: URL,
  body: unknown,
  timeoutMs: number,
): Promise<GeminiHttpResponse> {
  const requestBody = JSON.stringify(body)

  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (response) => {
        let responseBody = ''

        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          responseBody += chunk
        })
        response.on('end', () => {
          try {
            resolve({
              ok: response.statusCode ? response.statusCode >= 200 && response.statusCode < 300 : false,
              status: response.statusCode ?? 0,
              data: responseBody ? JSON.parse(responseBody) : null,
            })
          } catch (error) {
            reject(error)
          }
        })
      },
    )

    req.setTimeout(timeoutMs, () => {
      req.destroy(new GeminiApiError('Gemini API request timed out'))
    })
    req.on('error', reject)
    req.end(requestBody)
  })
}

export function validateSynthesisPayload(body: unknown): { synthesis: SynthesisOutput } {
  if (!isPlainObject(body) || Object.keys(body).length !== 1 || !('synthesis' in body)) {
    throw new PayloadValidationError('invalid synthesis payload')
  }

  const synthesis = body.synthesis
  if (!isPlainObject(synthesis)) {
    throw new PayloadValidationError('invalid synthesis payload')
  }

  for (const key of Object.keys(synthesis)) {
    if (!ALLOWED_SYNTHESIS_KEYS.has(key as keyof SynthesisOutput)) {
      throw new PayloadValidationError(`unexpected field: ${key}`)
    }
  }

  const missing = REQUIRED_KEYS.find((key) => !(key in synthesis))
  if (missing) {
    throw new PayloadValidationError(`missing synthesis field: ${String(missing)}`)
  }

  if (
    typeof synthesis.sessionId !== 'string' ||
    !Array.isArray(synthesis.flaggedBiomarkers) ||
    !Array.isArray(synthesis.topContributors) ||
    !isPlainObject(synthesis.questionnaireContext) ||
    !isPlainObject(synthesis.longitudinalSummary)
  ) {
    throw new PayloadValidationError('invalid synthesis payload')
  }

  assertNoProhibitedFields(synthesis)

  return { synthesis: synthesis as unknown as SynthesisOutput }
}

export function buildGeminiRequest(synthesis: SynthesisOutput) {
  return {
    systemInstruction: {
      parts: [
        {
          text:
            'You create EndoBridge PCOS monitoring reports from structured data only. ' +
            'Use strictly observational language. Do not diagnose, prescribe, give treatment plans, ' +
            'or provide lifestyle instructions. Do not state that a user has, does not have, is clear of, ' +
            'is positive for, or is negative for PCOS. Return JSON only.',
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: JSON.stringify({
              synthesis,
              responseContract: {
                observationalSummary:
                  'Two to four short paragraphs describing patterns in submitted values only.',
                observations: 'One to four short observational bullets.',
              },
            }),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          observationalSummary: { type: 'string' },
          observations: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['observationalSummary', 'observations'],
      },
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  }
}

export function extractGeminiText(response: unknown) {
  if (!isPlainObject(response) || !Array.isArray(response.candidates)) {
    throw new Error('malformed Gemini response')
  }

  const candidate = response.candidates[0]
  if (!isPlainObject(candidate) || !isPlainObject(candidate.content)) {
    throw new Error('malformed Gemini response')
  }

  const parts = candidate.content.parts
  if (!Array.isArray(parts)) {
    throw new Error('malformed Gemini response')
  }

  const text = parts
    .map((part) => {
      if (isPlainObject(part) && (part.thought === true || 'thought' in part)) {
        return ''
      }
      return isPlainObject(part) && typeof part.text === 'string' ? part.text : ''
    })
    .join('')
    .trim()

  if (!text) {
    throw new Error('empty Gemini response')
  }

  return text
}

export function parseGeminiReport(rawText: string, synthesis: SynthesisOutput): InsightReport {
  if (rawText.length > 8_000) {
    throw new Error('Gemini response exceeded report bounds')
  }

  const parsed = JSON.parse(stripJsonFence(rawText))

  if (!isPlainObject(parsed) || typeof parsed.observationalSummary !== 'string') {
    throw new Error('malformed Gemini report')
  }

  const observations = assertStringArray(parsed.observations)
  const generatedText = [parsed.observationalSummary, ...observations].join('\n')

  if (unsafeTextPatterns().some((pattern) => pattern.test(generatedText))) {
    throw new UnsafeGeminiOutputError()
  }

  return {
    observationalSummary: parsed.observationalSummary.trim(),
    observations: observations.map((item) => item.trim()).filter(Boolean).slice(0, 4),
    contributors: buildReportContributors(synthesis),
    reportTimestamp: new Date().toISOString(),
  }
}

export async function callGemini(
  synthesis: SynthesisOutput,
  transport: GeminiTransport = postJson,
) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new GeminiApiError('insight generation is not configured')
  }

  const model = normalizeModelName(process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL)
  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
  )

  try {
    const response = await transport(endpoint, buildGeminiRequest(synthesis), GEMINI_REQUEST_TIMEOUT_MS)

    if (!response.ok) {
      throw new GeminiApiError('Gemini API request failed')
    }

    return extractGeminiText(response.data)
  } catch (error) {
    if (error instanceof GeminiApiError) {
      throw error
    }

    throw new GeminiApiError('Gemini API request failed')
  }
}

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

  if (isRateLimited(clientKey(req))) {
    sendJson(res, 429, { error: 'too many insight generation requests' })
    return
  }

  try {
    let bodyObj: unknown
    const requestWithBody = req as RequestWithOptionalBody
    if (requestWithBody.body !== undefined) {
      bodyObj =
        typeof requestWithBody.body === 'string'
          ? JSON.parse(requestWithBody.body)
          : requestWithBody.body
    } else {
      bodyObj = JSON.parse(await readBody(req))
    }

    const { synthesis } = validateSynthesisPayload(bodyObj)
    const rawReport = await callGemini(synthesis)
    sendJson(res, 200, parseGeminiReport(rawReport, synthesis))
  } catch (error) {
    console.error(
      '[generate-insight]',
      error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error',
    )

    if (error instanceof PayloadValidationError || error instanceof SyntaxError) {
      sendJson(res, 400, { error: 'invalid request' })
      return
    }

    if (error instanceof UnsafeGeminiOutputError) {
      sendJson(res, 422, { error: UNSAFE_OUTPUT_REJECTED })
      return
    }

    if (error instanceof GeminiApiError) {
      sendJson(res, 503, { error: 'insight generation is temporarily unavailable' })
      return
    }

    if (error instanceof Error && error.message === 'payload too large') {
      sendJson(res, 413, { error: 'payload too large' })
      return
    }

    sendJson(res, 500, { error: 'insight report could not be generated safely' })
  }
}
