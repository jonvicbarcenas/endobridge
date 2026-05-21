import { describe, expect, it } from 'vitest'
import { buildGeminiPayload } from './proxyClient'
import type { SynthesisOutput } from '../types/insight'

describe('buildGeminiPayload', () => {
  it('sends synthesis output only and excludes medication details and raw history', () => {
    const synthesis: SynthesisOutput = {
      sessionId: 'session-1',
      flaggedBiomarkers: [],
      topContributors: [],
      questionnaireContext: { cyclePattern: 'irregular' },
      longitudinalSummary: { priorSessionCount: 2 },
    }

    const payload = buildGeminiPayload(synthesis)
    const serialized = JSON.stringify(payload)

    expect(payload).toEqual({ synthesis })
    expect(serialized).not.toMatch(/dosage|scheduleTime|medication|rawHistory/i)
  })
})
