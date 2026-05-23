import type { LabSession, MedicationRecord, SymptomEntry } from '../types/session'
import { getSymptomOrder } from '../config/symptoms'

const SESSIONS_KEY = 'sessions'
const SYMPTOMS_KEY = 'symptoms'
const MEDICATIONS_KEY = 'medications'
const SCHEMA_VERSION_KEY = 'endobridge:schemaVersion'
const CONSENT_KEY = 'endobridge:consentAccepted'
const AGE_GATE_KEY = 'endobridge:ageEligible'
const SCHEMA_VERSION = '1'

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeArray<T>(key: string, value: T[]) {
  localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
  localStorage.setItem(key, JSON.stringify(value))
}

function sortSymptoms(symptoms: SymptomEntry[]) {
  return [...symptoms].sort((left, right) => {
    const timestampSort = Date.parse(right.timestamp) - Date.parse(left.timestamp)
    if (timestampSort !== 0) return timestampSort

    const symptomSort = getSymptomOrder(left.symptomKey) - getSymptomOrder(right.symptomKey)
    if (symptomSort !== 0) return symptomSort

    return left.entryId.localeCompare(right.entryId)
  })
}

function sortMedications(medications: MedicationRecord[]) {
  return [...medications].sort((left, right) => {
    if (left.isActive !== right.isActive) return left.isActive ? -1 : 1

    const nextLeft = left.nextReminderAt ? Date.parse(left.nextReminderAt) : Number.MAX_SAFE_INTEGER
    const nextRight = right.nextReminderAt ? Date.parse(right.nextReminderAt) : Number.MAX_SAFE_INTEGER
    if (nextLeft !== nextRight) return nextLeft - nextRight

    return left.name.localeCompare(right.name)
  })
}

export class LocalStorageService {
  saveConsent() {
    localStorage.setItem(CONSENT_KEY, 'true')
    localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
  }

  hasConsent() {
    return localStorage.getItem(CONSENT_KEY) === 'true'
  }

  saveAgeEligibility() {
    localStorage.setItem(AGE_GATE_KEY, 'true')
    localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
  }

  hasAgeEligibility() {
    return localStorage.getItem(AGE_GATE_KEY) === 'true'
  }

  saveSession(session: LabSession) {
    const sessions = this.getAllSessions().filter(
      (item) => item.sessionId !== session.sessionId,
    )
    writeArray(SESSIONS_KEY, [session, ...sessions])
  }

  getAllSessions() {
    return readArray<LabSession>(SESSIONS_KEY)
  }

  getSession(sessionId: string) {
    return this.getAllSessions().find((session) => session.sessionId === sessionId) ?? null
  }

  saveSymptom(symptom: SymptomEntry) {
    const symptoms = this.getAllSymptoms().filter((item) => item.entryId !== symptom.entryId)
    writeArray(SYMPTOMS_KEY, sortSymptoms([symptom, ...symptoms]))
  }

  saveSymptomsForSession(sessionId: string, entries: SymptomEntry[]) {
    const entryKeys = new Set(entries.map((entry) => entry.symptomKey))
    const symptoms = this.getAllSymptoms().filter(
      (symptom) => !(symptom.sessionId === sessionId && entryKeys.has(symptom.symptomKey)),
    )

    writeArray(SYMPTOMS_KEY, sortSymptoms([...entries, ...symptoms]))
  }

  getAllSymptoms() {
    return sortSymptoms(readArray<SymptomEntry>(SYMPTOMS_KEY))
  }

  getSymptomsForSession(sessionId: string) {
    return this.getAllSymptoms().filter((symptom) => symptom.sessionId === sessionId)
  }

  saveMedication(medication: MedicationRecord) {
    const medications = this.getMedications().filter(
      (item) => item.medId !== medication.medId,
    )
    writeArray(MEDICATIONS_KEY, sortMedications([medication, ...medications]))
  }

  updateMedication(medId: string, updates: Partial<MedicationRecord>) {
    const medications = this.getMedications().map((medication) =>
      medication.medId === medId ? { ...medication, ...updates } : medication,
    )
    writeArray(MEDICATIONS_KEY, sortMedications(medications))
  }

  deleteMedication(medId: string) {
    writeArray(
      MEDICATIONS_KEY,
      this.getMedications().filter((medication) => medication.medId !== medId),
    )
  }

  getMedications() {
    return sortMedications(readArray<MedicationRecord>(MEDICATIONS_KEY))
  }

  clearAll() {
    localStorage.removeItem(SESSIONS_KEY)
    localStorage.removeItem(SYMPTOMS_KEY)
    localStorage.removeItem(MEDICATIONS_KEY)
    localStorage.removeItem(CONSENT_KEY)
    localStorage.removeItem(AGE_GATE_KEY)
    localStorage.removeItem(SCHEMA_VERSION_KEY)
  }
}
