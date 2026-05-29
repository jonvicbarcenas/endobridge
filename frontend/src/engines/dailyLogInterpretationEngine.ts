import type { DailyLogRecord } from '../types/monitoring'

export interface DailyLogInterpretation {
  logId: string
  date: string
  mood: string | null
  summary: string
  possibleReasons: string[]
  plainLanguage: string
}

function hasText(value: string | null | undefined, pattern: RegExp) {
  return Boolean(value && pattern.test(value))
}

function lowerLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase() || ''
}

function buildReasons(log: DailyLogRecord) {
  const reasons: string[] = []

  if (log.stressLevel !== null && log.stressLevel >= 4) reasons.push('higher stress')
  if (log.sleepHours !== null && log.sleepHours < 6) reasons.push('short sleep')
  if (hasText(log.symptomsNote, /craving|bloat|cramp|fatigue|acne|hair|weight/i)) {
    reasons.push('body symptoms noted today')
  }
  if (hasText(log.cycleEvent, /period|spotting|cramp|irregular/i)) {
    reasons.push('cycle timing or symptoms')
  }
  if (hasText(log.foodNotes, /skipped|craving|light appetite|meal/i)) {
    reasons.push('food or appetite changes')
  }
  if (reasons.length === 0) reasons.push('the notes you entered today')

  return reasons
}

export function interpretDailyLog(log: DailyLogRecord): DailyLogInterpretation {
  const mood = log.mood.trim() || null
  const moodLabel = lowerLabel(mood) || 'your wellness note'
  const reasons = buildReasons(log)
  const symptomText = log.symptomsNote.trim()
  const cycleText = log.cycleEvent.trim()
  const summaryParts = [
    mood ? `Mood was logged as ${moodLabel}` : '',
    symptomText ? `symptoms noted: ${symptomText}` : '',
    cycleText ? `cycle note: ${cycleText}` : '',
  ].filter(Boolean)
  const summary =
    summaryParts.length > 0
      ? `${summaryParts.join('; ')}.`
      : 'This log has a few wellness notes saved for trend comparison.'

  return {
    logId: log.logId,
    date: log.date,
    mood,
    summary,
    possibleReasons: reasons,
    plainLanguage: log.plainLanguage || `In simple terms, this entry may be connected to ${reasons.join(', ')}. It is a tracking note for pattern awareness only.`,
  }
}

export function summarizeDailyLogsForSynthesis(logs: DailyLogRecord[]) {
  return logs
    .slice()
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
    .slice(0, 5)
    .map(interpretDailyLog)
}
