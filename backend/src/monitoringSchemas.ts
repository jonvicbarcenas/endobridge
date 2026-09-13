import { z } from 'zod'
import { backendReferenceRanges } from './referenceRanges.js'
import type { MonitoringCollection } from './records.js'

const idSchema = z.string().trim().min(1).max(200)
const shortText = z.string().max(500)
const noteText = z.string().max(4_000)
const isoDate = z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'invalid datetime' })
const nullableIsoDate = isoDate.nullable()

const biomarkerKeys = [
  'ldlC',
  'fastingGlucose',
  'fastingInsulin',
  'totalTestosterone',
  'amh',
  'lhFshRatio',
  'dheas',
] as const

const clinicalRanges = {
  ldlC: { min: 0, max: 129 },
  fastingGlucose: { min: 70, max: 99 },
  fastingInsulin: { min: 2, max: 20 },
  totalTestosterone: { min: 15, max: 70 },
  amh: { min: 1, max: 6.8 },
  lhFshRatio: { min: 0.5, max: 2 },
  dheas: { min: 35, max: 430 },
} as const

function biomarkerSchema(key: (typeof biomarkerKeys)[number]) {
  const range = backendReferenceRanges[key]
  const clinical = clinicalRanges[key]
  return z
    .object({
      key: z.literal(key),
      value: z.number().finite().min(range.plausibilityMin).max(range.plausibilityMax),
      unit: z.literal(range.unit),
      isPlausible: z.literal(true),
      isFlagged: z.boolean(),
      direction: z.enum(['low', 'high', 'normal']),
    })
    .strict()
    .superRefine((entry, context) => {
      const direction = entry.value < clinical.min ? 'low' : entry.value > clinical.max ? 'high' : 'normal'
      if (entry.direction !== direction || entry.isFlagged !== (direction !== 'normal')) {
        context.addIssue({ code: 'custom', message: `inconsistent ${key} range classification` })
      }
    })
}

const questionnaireValue = z.union([
  z.string().max(1_000),
  z.array(z.string().max(200)).max(30),
  z.number().finite(),
  z.boolean(),
  z.null(),
])

const questionnaireSchema = z.record(z.string().min(1).max(100), questionnaireValue)

const labSessionSchema = z
  .object({
    sessionId: idSchema,
    timestamp: isoDate,
    status: z.enum(['in-progress', 'complete']),
    biomarkers: z
      .object({
        ldlC: biomarkerSchema('ldlC'),
        fastingGlucose: biomarkerSchema('fastingGlucose'),
        fastingInsulin: biomarkerSchema('fastingInsulin'),
        totalTestosterone: biomarkerSchema('totalTestosterone'),
        amh: biomarkerSchema('amh'),
        lhFshRatio: biomarkerSchema('lhFshRatio'),
        dheas: biomarkerSchema('dheas'),
      })
      .strict(),
    supplementary: z
      .object({
        age: z.number().int().min(18).max(120),
        bmi: z.number().finite().min(10).max(100).nullable().optional(),
        weightKg: z.number().finite().min(20).max(500).nullable().optional(),
        heightCm: z.number().finite().min(80).max(250).nullable().optional(),
        labDocumentIds: z.array(idSchema).max(20).nullable().optional(),
        cycleRegularity: shortText.nullable().optional(),
      })
      .passthrough(),
    questionnaire: questionnaireSchema.nullable().optional(),
    insightReport: z.unknown().nullable().optional(),
  })
  .strict()

const symptomSchema = z
  .object({
    entryId: idSchema,
    sessionId: idSchema,
    symptomKey: z.enum(['cycleIrregularity', 'acne', 'hirsutism', 'fatigue', 'weightChange']),
    severity: z.enum(['none', 'mild', 'moderate', 'severe']),
    note: noteText.nullable(),
    timestamp: isoDate,
  })
  .strict()

const medicationSchema = z
  .object({
    medId: idSchema,
    name: shortText.min(1),
    dosage: shortText.min(1),
    scheduleTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    frequency: z.enum(['daily', 'weekly', 'asNeeded']),
    createdAt: isoDate,
    nextReminderAt: nullableIsoDate,
    isActive: z.boolean(),
    lastTakenAt: nullableIsoDate.optional(),
  })
  .strict()

const dailyLogSchema = z
  .object({
    logId: idSchema,
    date: isoDate,
    foodNotes: noteText,
    exercise: noteText,
    sleepHours: z.number().finite().min(0).max(24).nullable(),
    mood: shortText,
    stressLevel: z.number().int().min(1).max(10).nullable(),
    cycleEvent: noteText,
    weightKg: z.number().finite().min(20).max(500).nullable(),
    medicationAdherence: noteText,
    symptomsNote: noteText,
    createdAt: isoDate,
    plainLanguage: z.string().max(500).optional(),
  })
  .strict()

const extractedBiomarkerSchema = z
  .object({
    key: z.enum(biomarkerKeys),
    value: z.number().finite(),
    unit: shortText,
    sourceLabel: shortText,
    confidence: z.enum(['high', 'medium']),
  })
  .strict()

const labDocumentSchema = z
  .object({
    documentId: idSchema,
    fileName: z.string().min(1).max(255),
    fileType: z.enum([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]),
    fileSize: z.number().int().min(1).max(6_000_000),
    uploadedAt: isoDate,
    dataUrl: z.string().startsWith('data:').max(8_100_000),
    extractionStatus: z.enum(['stored-only', 'scanned', 'ocr-scanned', 'scan-failed']),
    extractedTextPreview: z.string().max(800).optional(),
    extractedBiomarkers: z.partialRecord(z.enum(biomarkerKeys), extractedBiomarkerSchema).optional(),
    scanMessage: z.string().max(500).optional(),
  })
  .strict()

const questionnaireRecordSchema = z
  .object({
    responseId: idSchema,
    sessionId: idSchema,
    responses: questionnaireSchema,
    createdAt: isoDate,
  })
  .strict()

const publicSchemas: Partial<Record<MonitoringCollection, z.ZodType>> = {
  labSessions: labSessionSchema,
  questionnaireResponses: questionnaireRecordSchema,
  symptoms: symptomSchema,
  medications: medicationSchema,
  dailyLogs: dailyLogSchema,
  labDocuments: labDocumentSchema,
}

export class MonitoringValidationError extends Error {
  constructor(message = 'invalid monitoring record') {
    super(message)
    this.name = 'MonitoringValidationError'
  }
}

export function validateMonitoringRecord(collection: MonitoringCollection, data: unknown) {
  const schema = publicSchemas[collection]
  if (!schema) throw new MonitoringValidationError('collection is not writable through this endpoint')

  const result = schema.safeParse(data)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'record'
    throw new MonitoringValidationError(`invalid monitoring record at ${path}: ${issue?.message ?? 'invalid value'}`)
  }
  return result.data
}

export function validateReportRequest(data: unknown) {
  const result = z.object({ sessionId: idSchema }).strict().safeParse(data)
  if (!result.success) throw new MonitoringValidationError('invalid report request')
  return result.data
}

function parseRequest<T>(schema: z.ZodType<T>, data: unknown, message: string) {
  const result = schema.safeParse(data)
  if (!result.success) throw new MonitoringValidationError(message)
  return result.data
}

export function validateCredentialsRequest(data: unknown) {
  return parseRequest(
    z
      .object({
        email: z.string().trim().email().max(254),
        password: z.string().min(1).max(128),
      })
      .strict(),
    data,
    'invalid credentials request',
  )
}

export function validateTermsRequest(data: unknown) {
  return parseRequest(
    z
      .object({
        acceptedTerms: z.literal(true),
        acceptedPrivacy: z.literal(true),
        confirmedAge: z.literal(true),
        acceptedDisclaimer: z.literal(true),
      })
      .strict(),
    data,
    'terms acceptance incomplete',
  )
}

export function validateScanRequest(data: unknown) {
  return parseRequest(
    z.object({ dataUrl: z.string().startsWith('data:').max(8_100_000) }).strict(),
    data,
    'invalid lab document payload',
  )
}
