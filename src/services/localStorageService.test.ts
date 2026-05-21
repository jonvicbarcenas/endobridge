import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageService } from './localStorageService'
import type { LabSession, MedicationRecord, SymptomEntry } from '../types/session'

describe('LocalStorageService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores sessions, symptoms, and medications under the documented top-level keys', () => {
    const service = new LocalStorageService()
    const session = {
      sessionId: 'session-1',
      timestamp: '2026-05-21T00:00:00.000Z',
      status: 'complete',
      biomarkers: {},
      supplementary: {},
      questionnaire: null,
      insightReport: null,
    } as LabSession
    const symptom = {
      entryId: 'symptom-1',
      sessionId: 'session-1',
      symptomKey: 'acne',
      severity: 'moderate',
      note: null,
      timestamp: session.timestamp,
    } as SymptomEntry
    const medication = {
      medId: 'med-1',
      name: 'Prescribed medication',
      dosage: '1 tablet',
      scheduleTime: '08:00',
      frequency: 'daily',
      createdAt: session.timestamp,
      nextReminderAt: null,
      isActive: true,
    } as MedicationRecord

    service.saveSession(session)
    service.saveSymptom(symptom)
    service.saveMedication(medication)

    expect(service.getAllSessions()).toEqual([session])
    expect(service.getAllSymptoms()).toEqual([symptom])
    expect(service.getMedications()).toEqual([medication])
  })
})
