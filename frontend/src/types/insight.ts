import type { BiomarkerKey, Direction, SymptomKey, SymptomSeverity } from './session'

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

export type TrendLabel =
  | 'increased'
  | 'decreased'
  | 'unchanged'
  | 'newly flagged'
  | 'no prior data'
  | 'no current data'

export interface BiomarkerTrendSummary {
  key: BiomarkerKey
  label: string
  previousSessionId: string | null
  currentSessionId: string
  previousValue: number | null
  currentValue: number | null
  unit: string | null
  previousDirection: Direction | null
  currentDirection: Direction | null
  trendLabel: TrendLabel
}

export interface SymptomTrendPayload {
  symptomKey: SymptomKey
  label: string
  previousSessionId: string | null
  currentSessionId: string | null
  previousSeverity: SymptomSeverity | null
  currentSeverity: SymptomSeverity | null
  trendLabel: TrendLabel
}

export interface LongitudinalSummary {
  priorSessionCount: number
  biomarkerTrends: BiomarkerTrendSummary[]
  symptomTrends: SymptomTrendPayload[]
}

export interface SynthesisOutput {
  sessionId: string
  flaggedBiomarkers: FlaggedBiomarker[]
  topContributors: Contributor[]
  questionnaireContext: Record<string, unknown>
  longitudinalSummary: LongitudinalSummary
}

export interface ReportContributor extends Contributor {
  biomarkerLabel: string
  value: number
  unit: string
  direction: Exclude<Direction, 'normal'>
}

export interface InsightReport {
  observationalSummary: string
  observations: string[]
  contributors: ReportContributor[]
  reportTimestamp: string
}
