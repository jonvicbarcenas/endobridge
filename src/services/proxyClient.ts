import type { InsightReport, SynthesisOutput } from '../types/insight'

export interface GeminiProxyPayload {
  synthesis: SynthesisOutput
}

export function buildGeminiPayload(synthesis: SynthesisOutput): GeminiProxyPayload {
  return { synthesis }
}

export async function generateInsight(synthesis: SynthesisOutput): Promise<InsightReport> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch('/api/generate-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiPayload(synthesis)),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error('insight generation is temporarily unavailable')
    }

    return (await response.json()) as InsightReport
  } finally {
    window.clearTimeout(timeout)
  }
}
