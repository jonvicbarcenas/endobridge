import { allBiomarkers, assayDependentBiomarkers, mandatoryBiomarkers, referenceRanges, requiredNewBiomarkers } from '../config/referenceRanges'
import type {
  BiomarkerEntry,
  BiomarkerEntryMap,
  BiomarkerKey,
  LabSessionInput,
  ValidationResult,
} from '../types/session'

function directionFor(value: number, key: BiomarkerKey, referenceMin?: number, referenceMax?: number) {
  if (assayDependentBiomarkers.has(key) && referenceMin === undefined) return 'normal'
  const range = referenceRanges[key]
  const min = referenceMin ?? range.clinicalMin
  const max = referenceMax ?? range.clinicalMax
  if (value < min) return 'low'
  if (value > max) return 'high'
  return 'normal'
}

const historicalBiomarkers = [
  ...allBiomarkers, 'ogttTwoHourGlucose', 'fastingInsulin',
] as const satisfies readonly BiomarkerKey[]

export function validateLabSessionInput(input: LabSessionInput): ValidationResult {
  const errors: string[] = []
  const flags: string[] = []
  const validatedBiomarkers: BiomarkerEntryMap = {}

  if (!Number.isFinite(input.age) || input.age < 18) {
    errors.push('age must be at least 18')
  }

  if (input.panelVersion === 'fixed-ten' || input.glucoseTest) {
    const validWeight = input.weightKg !== undefined && Number.isFinite(input.weightKg) && input.weightKg >= 20 && input.weightKg <= 500
    const validHeight = input.heightCm !== undefined && Number.isFinite(input.heightCm) && input.heightCm >= 80 && input.heightCm <= 250
    if (!validWeight) errors.push('weightKg is required for BMI')
    if (!validHeight) errors.push('heightCm is required for BMI')
    if (validWeight && validHeight && (!Number.isFinite(input.bmi) || input.bmi! < 10 || input.bmi! > 100)) {
      errors.push('bmi must be calculated from weight and height')
    }
  }

  if (input.glucoseTest === 'ogtt' && !input.biomarkers.ogttTwoHourGlucose) errors.push('ogttTwoHourGlucose is required')
  if (input.glucoseTest === 'hba1c' && !input.biomarkers.hba1c) errors.push('hba1c is required')
  if (input.glucoseTest && input.glucoseTest !== 'hba1c' && !input.biomarkers.fastingGlucose) errors.push('fastingGlucose is required')
  const required: readonly BiomarkerKey[] = input.panelVersion === 'fixed-ten'
    ? requiredNewBiomarkers
    : input.glucoseTest ? ['totalCholesterol', 'ldlC', 'hdlC', 'triglycerides'] : mandatoryBiomarkers

  for (const key of input.panelVersion === 'fixed-ten' ? allBiomarkers : historicalBiomarkers) {
    const entry = input.biomarkers[key]
    const range = referenceRanges[key]

    if (!entry) {
      if (required.includes(key)) errors.push(`${key} is required`)
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

    if ((entry.referenceMin === undefined) !== (entry.referenceMax === undefined) ||
      (entry.referenceMin !== undefined && (!Number.isFinite(entry.referenceMin) || !Number.isFinite(entry.referenceMax) || entry.referenceMin > entry.referenceMax!))) {
      errors.push(`${key} has an invalid lab reference interval`)
      continue
    }
    const direction = directionFor(entry.value, key, entry.referenceMin, entry.referenceMax)
    const validated: BiomarkerEntry = {
      key,
      value: entry.value,
      unit: entry.unit || range.unit,
      ...(entry.referenceMin !== undefined ? { referenceMin: entry.referenceMin, referenceMax: entry.referenceMax } : {}),
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
