import { mandatoryBiomarkers, referenceRanges } from '../config/referenceRanges'
import { summarizeDailyLogsForSynthesis } from './dailyLogInterpretationEngine'
import { buildLongitudinalSummary } from './longitudinalSummaryEngine'
import type { SynthesisOutput } from '../types/insight'
import type { DailyLogRecord, LabDocumentRecord } from '../types/monitoring'
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
  dailyLogs?: DailyLogRecord[]
  labDocuments?: LabDocumentRecord[]
}

const DAILY_LOG_WINDOW_BEFORE_MS = 7 * 24 * 60 * 60 * 1000
const DAILY_LOG_WINDOW_AFTER_MS = 3 * 24 * 60 * 60 * 1000

function deviationScore(key: BiomarkerKey, value: number) {
  const range = referenceRanges[key]
  const midpoint = (range.clinicalMin + range.clinicalMax) / 2
  const width = Math.max(range.clinicalMax - range.clinicalMin, 1)

  return Number((Math.abs(value - midpoint) / width).toFixed(4))
}

function selectDailyLogsForSession(session: LabSession, logs: DailyLogRecord[]) {
  const sessionTime = Date.parse(session.timestamp)
  if (!Number.isFinite(sessionTime)) return []

  const windowStart = sessionTime - DAILY_LOG_WINDOW_BEFORE_MS
  const windowEnd = sessionTime + DAILY_LOG_WINDOW_AFTER_MS

  return logs.filter((log) => {
    const logTime = Date.parse(log.date)
    return Number.isFinite(logTime) && logTime >= windowStart && logTime <= windowEnd
  })
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

  const linkedDocumentIds = new Set(session.supplementary.labDocumentIds ?? [])
  const documentContext = (context.labDocuments ?? [])
    .filter((document) => linkedDocumentIds.size === 0 || linkedDocumentIds.has(document.documentId))
    .slice()
    .sort((left, right) => Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt))
    .slice(0, 3)
    .map((document) => ({
      documentId: document.documentId,
      fileName: document.fileName,
      fileType: document.fileType,
      extractionStatus: document.extractionStatus,
      extractedTextPreview: (document.extractedTextPreview ?? '').slice(0, 500),
      scanMessage: document.scanMessage ?? 'Uploaded lab result file was stored for review.',
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
    dailyLogSummary: summarizeDailyLogsForSynthesis(
      selectDailyLogsForSession(session, context.dailyLogs ?? []),
    ),
    labDocumentContext: documentContext,
  }
}
