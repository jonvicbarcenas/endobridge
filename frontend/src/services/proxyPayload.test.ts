import { describe, expect, it, vi } from 'vitest'
import {
  InsightServiceUnavailableError,
  UnsafeInsightError,
  buildGeminiPayload,
  generateInsight,
} from './proxyClient'
import type { SynthesisOutput } from '../types/insight'

describe('buildGeminiPayload', () => {
  it('sends synthesis output only and excludes medication details and raw history', () => {
    const synthesis: SynthesisOutput = {
      sessionId: 'session-1',
      flaggedBiomarkers: [],
      topContributors: [],
      questionnaireContext: { cyclePattern: 'irregular' },
      longitudinalSummary: { priorSessionCount: 2, biomarkerTrends: [], symptomTrends: [] },
    }

    const payload = buildGeminiPayload(synthesis)
    const serialized = JSON.stringify(payload)

    expect(payload).toEqual({ synthesis })
    expect(serialized).not.toMatch(/dosage|scheduleTime|medication|rawHistory/i)
  })

  it('maps proxy safety and service failures to specific client errors', async () => {
    const response = new Response(JSON.stringify({ error: 'UNSAFE_OUTPUT_REJECTED' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(generateInsight({
      sessionId: 'session-1',
      flaggedBiomarkers: [],
      topContributors: [],
      questionnaireContext: {},
      longitudinalSummary: { priorSessionCount: 0, biomarkerTrends: [], symptomTrends: [] },
    })).rejects.toBeInstanceOf(UnsafeInsightError)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'temporarily unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(generateInsight({
      sessionId: 'session-1',
      flaggedBiomarkers: [],
      topContributors: [],
      questionnaireContext: {},
      longitudinalSummary: { priorSessionCount: 0, biomarkerTrends: [], symptomTrends: [] },
    })).rejects.toBeInstanceOf(InsightServiceUnavailableError)
  })
})
