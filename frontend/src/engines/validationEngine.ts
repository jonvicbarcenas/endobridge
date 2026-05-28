import { mandatoryBiomarkers, referenceRanges } from '../config/referenceRanges'
import type {
  BiomarkerEntry,
  BiomarkerEntryMap,
  BiomarkerKey,
  LabSessionInput,
  ValidationResult,
} from '../types/session'

function directionFor(value: number, key: BiomarkerKey) {
  const range = referenceRanges[key]
  if (value < range.clinicalMin) return 'low'
  if (value > range.clinicalMax) return 'high'
  return 'normal'
}

export function validateLabSessionInput(input: LabSessionInput): ValidationResult {
  const errors: string[] = []
  const flags: string[] = []
  const validatedBiomarkers: BiomarkerEntryMap = {}

  if (!Number.isFinite(input.age) || input.age < 18) {
    errors.push('age must be at least 18')
  }

  for (const key of mandatoryBiomarkers) {
    const entry = input.biomarkers[key]
    const range = referenceRanges[key]

    if (!entry) {
      errors.push(`${key} is required`)
      continue
    }

    if (!Number.isFinite(entry.value)) {
      errors.push(`${key} must be a number`)
      continue
    }

    if (entry.value < range.plausibilityMin || entry.value > range.plausibilityMax) {
      errors.push(`${key} is outside plausibility bounds`)
      continue
    }

    const direction = directionFor(entry.value, key)
    const validated: BiomarkerEntry = {
      key,
      value: entry.value,
      unit: entry.unit || range.unit,
      isPlausible: true,
      isFlagged: direction !== 'normal',
      direction,
    }

    validatedBiomarkers[key] = validated

    if (validated.isFlagged) {
      flags.push(`${key} is ${direction}`)
    }
  }

  return {
    validatedBiomarkers,
    flags,
    errors,
    isValid: errors.length === 0,
  }
}
