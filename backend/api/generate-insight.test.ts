import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildGeminiRequest,
  callGemini,
  extractGeminiText,
  isRateLimited,
  parseGeminiReport,
  resetRateLimitForTests,
  validateSynthesisPayload,
  buildDailyLogSummaryRequest,
  callGeminiForDailyLogSummary,
} from './generate-insight'
import type { SynthesisOutput } from '../../frontend/src/types/insight'

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
  dailyLogSummary: [
    {
      logId: 'daily-1',
      date: '2026-05-29T07:00:00.000Z',
      mood: 'Anxious',
      summary: 'Mood was logged as anxious.',
      possibleReasons: ['higher stress'],
      plainLanguage: 'In simple terms, this entry may be connected to higher stress.',
    },
  ],
  labDocumentContext: [
    {
      documentId: 'doc-1',
      fileName: 'lab-photo.png',
      fileType: 'image/png',
      extractionStatus: 'ocr-scanned',
      extractedTextPreview: 'LDL cholesterol 180 mg/dL',
      scanMessage: 'Scanned image and found 1 biomarker value for review.',
    },
  ],
}

describe('Gemini insight proxy helpers', () => {
  afterEach(() => {
    resetRateLimitForTests()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
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
    expect(serialized).toContain('observationReasons')
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
        observationReasons: [
          'This may reflect the submitted fasting glucose value and recent tracking context.',
        ],
      }),
      synthesis,
    )

    expect(report).toEqual({
      observationalSummary:
        'LDL cholesterol was above the reference range in this submitted session.',
      observations: ['Fasting glucose was also flagged above range.'],
      observationReasons: [
        'This may reflect the submitted fasting glucose value and recent tracking context.',
      ],
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
          observationReasons: [],
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
              parts: [{ text: '{"observationalSummary":"ok","observations":[],"observationReasons":[]}' }],
            },
          },
        ],
      }),
    ).toBe('{"observationalSummary":"ok","observations":[],"observationReasons":[]}')
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

  it('uses the responsive default model and aborts stalled Gemini requests before Vercel timeout', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const transport = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      data: { error: { status: 'INTERNAL' } },
    })

    await expect(callGemini(synthesis, transport)).rejects.toThrow(
      /Gemini API request failed/i,
    )

    const [url, request, timeoutMs] = transport.mock.calls[0]
    expect(String(url)).toContain('/models/gemini-3.1-flash-lite:generateContent')
    expect(JSON.stringify(request)).toContain('strictly observational')
    expect(timeoutMs).toBeLessThan(30_000)
  })

  describe('daily log summary generation', () => {
    const dailyLog = {
      foodNotes: 'Skipped breakfast',
      exercise: 'Walk',
      sleepHours: 7,
      mood: 'Okay',
      stressLevel: 5,
      cycleEvent: 'Cramps',
      weightKg: 65,
      symptomsNote: 'Fatigue',
    }

    it('builds a daily log request with system instructions and JSON schema', () => {
      const request = buildDailyLogSummaryRequest(dailyLog)
      const serialized = JSON.stringify(request)

      expect(request.generationConfig).toEqual(
        expect.objectContaining({
          temperature: 0.6,
          maxOutputTokens: 150,
          responseMimeType: 'application/json',
          responseSchema: expect.objectContaining({
            required: ['plainLanguage'],
          }),
        }),
      )
      expect(serialized).toContain('Skipped breakfast')
      expect(serialized).toContain('Cramps')
    })

    it('successfully calls Gemini and extracts the layman summary', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key')
      const transport = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      plainLanguage: 'In simple terms, you felt okay with short sleep and fatigue.',
                    }),
                  },
                ],
              },
            },
          ],
        },
      })

      const summary = await callGeminiForDailyLogSummary(dailyLog, transport)
      expect(summary).toBe('In simple terms, you felt okay with short sleep and fatigue.')
    })

    it('rejects unsafe output from daily log summary', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key')
      const transport = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      plainLanguage: 'This means you have PCOS and need metformin treatment.',
                    }),
                  },
                ],
              },
            },
          ],
        },
      })

      await expect(callGeminiForDailyLogSummary(dailyLog, transport)).rejects.toThrow(
        /unsafe/i,
      )
    })
  })
})
