import type { LabSession, MedicationRecord, SymptomEntry } from '../types/session'

const SESSIONS_KEY = 'sessions'
const SYMPTOMS_KEY = 'symptoms'
const MEDICATIONS_KEY = 'medications'
const SCHEMA_VERSION_KEY = 'endobridge:schemaVersion'
const SCHEMA_VERSION = '1'

function readArray<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []

  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

function writeArray<T>(key: string, value: T[]) {
  localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
  localStorage.setItem(key, JSON.stringify(value))
}

export class LocalStorageService {
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
    writeArray(SYMPTOMS_KEY, [symptom, ...symptoms])
  }

  getAllSymptoms() {
    return readArray<SymptomEntry>(SYMPTOMS_KEY)
  }

  getSymptomsForSession(sessionId: string) {
    return this.getAllSymptoms().filter((symptom) => symptom.sessionId === sessionId)
  }

  saveMedication(medication: MedicationRecord) {
    const medications = this.getMedications().filter(
      (item) => item.medId !== medication.medId,
    )
    writeArray(MEDICATIONS_KEY, [medication, ...medications])
  }

  getMedications() {
    return readArray<MedicationRecord>(MEDICATIONS_KEY)
  }

  clearAll() {
    localStorage.removeItem(SESSIONS_KEY)
    localStorage.removeItem(SYMPTOMS_KEY)
    localStorage.removeItem(MEDICATIONS_KEY)
    localStorage.removeItem(SCHEMA_VERSION_KEY)
  }
}
