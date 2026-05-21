import type { BiomarkerKey, Direction } from './session'

export interface FlaggedBiomarker {
  key: BiomarkerKey
  value: number
  unit: string
  deviationScore: number
  direction: Direction
}

export interface Contributor {
  rank: number
  key: BiomarkerKey
  weight: number
}

export interface SynthesisOutput {
  sessionId: string
  flaggedBiomarkers: FlaggedBiomarker[]
  topContributors: Contributor[]
  questionnaireContext: Record<string, unknown>
  longitudinalSummary: Record<string, unknown>
}

export interface InsightReport {
  summary: string
  observations: string[]
  contributors: Contributor[]
  disclaimer: string
  distressNote: string
  generatedAt: string
}
