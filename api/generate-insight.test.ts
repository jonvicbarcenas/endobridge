import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildGeminiRequest,
  extractGeminiText,
  isRateLimited,
  parseGeminiReport,
  resetRateLimitForTests,
  validateSynthesisPayload,
} from './generate-insight'
import type { SynthesisOutput } from '../src/types/insight'

const synthesis: SynthesisOutput = {
  sessionId: 'session-1',
  flaggedBiomarkers: [
    {
      key: 'ldlC',
      value: 180,
      unit: 'mg/dL',
      deviationScore: 1.2,
      direction: 'high',
    },
  ],
  topContributors: [
    {
      rank: 1,
      key: 'ldlC',
      weight: 0.5,
    },
  ],
  questionnaireContext: {
    'cycle-pattern': 'irregular',
  },
  longitudinalSummary: {
    priorSessionCount: 1,
    biomarkerTrends: [],
    symptomTrends: [],
  },
}

describe('Gemini insight proxy helpers', () => {
  afterEach(() => {
    resetRateLimitForTests()
  })

  it('accepts only the minimized synthesis envelope and rejects medication detail keys', () => {
    expect(validateSynthesisPayload({ synthesis })).toEqual({ synthesis })

    expect(() =>
      validateSynthesisPayload({
        synthesis: {
          ...synthesis,
          medication: {
            name: 'Metformin',
            dosage: '500mg',
          },
        },
      }),
    ).toThrow(/unexpected field/i)
  })

  it('builds a bounded generateContent request with system instructions and JSON output', () => {
    const request = buildGeminiRequest(synthesis)
    const serialized = JSON.stringify(request)

    expect(request.generationConfig).toEqual(
      expect.objectContaining({
        temperature: 0.2,
        maxOutputTokens: expect.any(Number),
        responseMimeType: 'application/json',
      }),
    )
    expect(serialized).toContain('strictly observational')
    expect(serialized).toContain('session-1')
    expect(serialized).not.toMatch(/dosage|scheduleTime|medication/i)
  })

  it('parses model JSON into a deterministic local report and rejects unsafe language', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-23T01:02:03.000Z'))

    const report = parseGeminiReport(
      JSON.stringify({
        observationalSummary:
          'LDL cholesterol was above the reference range in this submitted session.',
        observations: ['Fasting glucose was also flagged above range.'],
      }),
      synthesis,
    )

    expect(report).toEqual({
      observationalSummary:
        'LDL cholesterol was above the reference range in this submitted session.',
      observations: ['Fasting glucose was also flagged above range.'],
      contributors: [
        {
          rank: 1,
          key: 'ldlC',
          biomarkerLabel: 'LDL-C',
          value: 180,
          unit: 'mg/dL',
          direction: 'high',
          weight: 0.5,
        },
      ],
      reportTimestamp: '2026-05-23T01:02:03.000Z',
    })

    expect(() =>
      parseGeminiReport(
        JSON.stringify({
          observationalSummary: 'This confirms you have PCOS and should take medication.',
          observations: [],
        }),
        synthesis,
      ),
    ).toThrow(/unsafe/i)

    vi.useRealTimers()
  })

  it('extracts generated text from Gemini candidates', () => {
    expect(
      extractGeminiText({
        candidates: [
          {
            content: {
              parts: [{ text: '{"observationalSummary":"ok","observations":[]}' }],
            },
          },
        ],
      }),
    ).toBe('{"observationalSummary":"ok","observations":[]}')
  })

  it('rate limits repeated proxy requests by client key without storing payloads', () => {
    const now = Date.parse('2026-05-23T00:00:00.000Z')

    expect(isRateLimited('client-1', now)).toBe(false)
    expect(isRateLimited('client-1', now + 1)).toBe(false)
    expect(isRateLimited('client-1', now + 2)).toBe(false)
    expect(isRateLimited('client-1', now + 3)).toBe(false)
    expect(isRateLimited('client-1', now + 4)).toBe(false)
    expect(isRateLimited('client-1', now + 5)).toBe(true)
    expect(isRateLimited('client-2', now + 5)).toBe(false)
    expect(isRateLimited('client-1', now + 60_001)).toBe(false)
  })
})
