import { mandatoryBiomarkers, referenceRanges } from '../config/referenceRanges'
import { buildLongitudinalSummary } from './longitudinalSummaryEngine'
import type { SynthesisOutput } from '../types/insight'
import type { BiomarkerKey, LabSession, SymptomEntry } from '../types/session'

export class InsufficientDataError extends Error {
  constructor(message = 'mandatory biomarker data is incomplete') {
    super(message)
    this.name = 'InsufficientDataError'
  }
}

interface ScoreSessionContext {
  sessions?: LabSession[]
  symptoms?: SymptomEntry[]
}

function deviationScore(key: BiomarkerKey, value: number) {
  const range = referenceRanges[key]
  const midpoint = (range.clinicalMin + range.clinicalMax) / 2
  const width = Math.max(range.clinicalMax - range.clinicalMin, 1)

  return Number((Math.abs(value - midpoint) / width).toFixed(4))
}

export function scoreSession(session: LabSession, context: ScoreSessionContext = {}): SynthesisOutput {
  const missing = mandatoryBiomarkers.filter((key) => !session.biomarkers[key])

  if (missing.length > 0) {
    throw new InsufficientDataError(`missing mandatory biomarkers: ${missing.join(', ')}`)
  }

  const flaggedBiomarkers = mandatoryBiomarkers
    .map((key) => {
      const biomarker = session.biomarkers[key]
      if (!biomarker || !biomarker.isFlagged) return null

      return {
        key,
        value: biomarker.value,
        unit: biomarker.unit,
        deviationScore: deviationScore(key, biomarker.value),
        direction: biomarker.direction === 'normal' ? 'high' : biomarker.direction,
      }
    })
    .filter((item) => item !== null)

  const topContributors = [...flaggedBiomarkers]
    .sort((a, b) => b.deviationScore - a.deviationScore)
    .slice(0, 3)
    .map((item, index) => ({
      rank: index + 1,
      key: item.key,
      weight: [0.5, 0.33, 0.17][index],
    }))

  return {
    sessionId: session.sessionId,
    flaggedBiomarkers,
    topContributors,
    questionnaireContext: session.questionnaire ?? {},
    longitudinalSummary: buildLongitudinalSummary(
      session,
      context.sessions ?? [session],
      context.symptoms ?? [],
    ),
  }
}
