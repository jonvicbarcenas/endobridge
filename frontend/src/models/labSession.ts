import type {
  LabSession,
  LabSessionInput,
  QuestionnaireResponse,
  ValidationResult,
} from '../types/session'

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createLabSession(
  input: LabSessionInput,
  validation: ValidationResult,
  questionnaire: QuestionnaireResponse | null = null,
): LabSession {
  if (!validation.isValid) {
    throw new Error('cannot create a lab session from invalid input')
  }

  return {
    sessionId: createId(),
    timestamp: new Date().toISOString(),
    status: 'complete',
    biomarkers: validation.validatedBiomarkers,
    supplementary: {
      age: input.age,
      bmi: input.bmi,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      labDocumentIds: input.labDocumentIds,
      cycleRegularity: input.cycleRegularity,
    },
    questionnaire,
    insightReport: null,
  }
}
