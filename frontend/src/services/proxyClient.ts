import type { InsightReport, SynthesisOutput } from '../types/insight'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export interface GeminiProxyPayload {
  synthesis: SynthesisOutput
}

export class InsightServiceUnavailableError extends Error {
  constructor(message = 'insight generation is temporarily unavailable') {
    super(message)
    this.name = 'InsightServiceUnavailableError'
  }
}

export class UnsafeInsightError extends Error {
  constructor(message = 'Gemini output was rejected by safety validation') {
    super(message)
    this.name = 'UnsafeInsightError'
  }
}

export function buildGeminiPayload(synthesis: SynthesisOutput): GeminiProxyPayload {
  return { synthesis }
}

async function readProxyError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string }
    return body.error ?? ''
  } catch {
    return ''
  }
}

export async function generateInsight(synthesis: SynthesisOutput): Promise<InsightReport> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 60_000)

  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-insight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiPayload(synthesis)),
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = await readProxyError(response)
      if (response.status === 422 || error === 'UNSAFE_OUTPUT_REJECTED') {
        throw new UnsafeInsightError()
      }
      throw new InsightServiceUnavailableError()
    }

    return (await response.json()) as InsightReport
  } catch (error) {
    if (error instanceof UnsafeInsightError || error instanceof InsightServiceUnavailableError) {
      throw error
    }

    throw new InsightServiceUnavailableError()
  } finally {
    window.clearTimeout(timeout)
  }
}
