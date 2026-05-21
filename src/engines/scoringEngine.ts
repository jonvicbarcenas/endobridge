import { mandatoryBiomarkers, referenceRanges } from '../config/referenceRanges'
import type { SynthesisOutput } from '../types/insight'
import type { BiomarkerKey, LabSession } from '../types/session'

export class InsufficientDataError extends Error {
  constructor(message = 'mandatory biomarker data is incomplete') {
    super(message)
    this.name = 'InsufficientDataError'
  }
}

function deviationScore(key: BiomarkerKey, value: number) {
  const range = referenceRanges[key]
  const midpoint = (range.clinicalMin + range.clinicalMax) / 2
  const width = Math.max(range.clinicalMax - range.clinicalMin, 1)

  return Number((Math.abs(value - midpoint) / width).toFixed(4))
}

export function scoreSession(session: LabSession): SynthesisOutput {
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
      weight: item.deviationScore,
    }))

  return {
    sessionId: session.sessionId,
    flaggedBiomarkers,
    topContributors,
    questionnaireContext: session.questionnaire ?? {},
    longitudinalSummary: {
      priorSessionCount: 0,
    },
  }
}
