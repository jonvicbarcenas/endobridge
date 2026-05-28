import { questionBank, type QuestionDefinition } from '../config/questionBank'
import type { BiomarkerEntryMap, BiomarkerKey, Direction } from '../types/session'

export interface FlagTrigger {
  key: BiomarkerKey
  direction: Direction
}

export interface QuestionnaireContext {
  biomarkers?: BiomarkerEntryMap
  flags?: FlagTrigger[]
  includeDailyContext?: boolean
  hasMedicationRecords?: boolean
}

const levelRank: Record<QuestionDefinition['level'], number> = {
  base: 0,
  'flag-follow-up': 1,
  'biomarker-based': 2,
  'daily-context': 3,
  'medication-adherence': 4,
}

function questionNumber(question: QuestionDefinition) {
  return Number(question.code.replace(/\D/g, ''))
}

function relatedToAny(question: QuestionDefinition, keys: Set<BiomarkerKey>) {
  return question.relatedBiomarkers?.some((key) => keys.has(key)) ?? false
}

export function generateQuestionnaire(context: QuestionnaireContext | FlagTrigger[]): QuestionDefinition[] {
  const normalizedContext: QuestionnaireContext = Array.isArray(context)
    ? { flags: context }
    : context
  const presentKeys = new Set(
    Object.values(normalizedContext.biomarkers ?? {})
      .filter(Boolean)
      .map((entry) => entry.key),
  )
  const flaggedKeys = new Set((normalizedContext.flags ?? []).map((flag) => flag.key))

  const selected = questionBank
    .filter((question) => {
      if (question.level === 'base') return true
      if (question.level === 'daily-context') return normalizedContext.includeDailyContext === true
      if (question.level === 'medication-adherence') {
        return normalizedContext.hasMedicationRecords === true
      }
      return relatedToAny(question, presentKeys)
    })
    .map((question) => ({
      ...question,
      level:
        question.level === 'biomarker-based' && relatedToAny(question, flaggedKeys)
          ? 'flag-follow-up'
          : question.level,
    }))

  return selected.sort((left, right) => {
    const rankDifference = levelRank[left.level] - levelRank[right.level]
    if (rankDifference !== 0) return rankDifference
    return questionNumber(left) - questionNumber(right)
  })
}
