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

  it('replaces symptom statuses by session and symptom key while keeping newest entries first', () => {
    const service = new LocalStorageService()
    const olderAcne = {
      entryId: 'older-acne',
      sessionId: 'session-1',
      symptomKey: 'acne',
      severity: 'mild',
      note: 'Initial acne note',
      timestamp: '2026-05-21T00:00:00.000Z',
    } as SymptomEntry
    const updatedAcne = {
      entryId: 'updated-acne',
      sessionId: 'session-1',
      symptomKey: 'acne',
      severity: 'severe',
      note: 'Updated acne note',
      timestamp: '2026-05-22T00:00:00.000Z',
    } as SymptomEntry
    const fatigue = {
      entryId: 'fatigue',
      sessionId: 'session-1',
      symptomKey: 'fatigue',
      severity: 'moderate',
      note: null,
      timestamp: '2026-05-22T00:00:00.000Z',
    } as SymptomEntry

    service.saveSymptom(olderAcne)
    service.saveSymptomsForSession('session-1', [updatedAcne, fatigue])

    expect(service.getSymptomsForSession('session-1')).toEqual([updatedAcne, fatigue])
    expect(service.getAllSymptoms()).toEqual([updatedAcne, fatigue])
  })

  it('stores consent and age eligibility flags', () => {
    const service = new LocalStorageService()

    expect(service.hasConsent()).toBe(false)
    expect(service.hasAgeEligibility()).toBe(false)

    service.saveConsent()
    service.saveAgeEligibility()

    expect(service.hasConsent()).toBe(true)
    expect(service.hasAgeEligibility()).toBe(true)
  })

  it('clearAll removes sessions, symptoms, medications, consent, and age gate data', () => {
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

    service.saveConsent()
    service.saveAgeEligibility()
    service.saveSession(session)
    service.saveSymptom(symptom)
    service.saveMedication(medication)

    service.clearAll()

    expect(service.hasConsent()).toBe(false)
    expect(service.hasAgeEligibility()).toBe(false)
    expect(service.getAllSessions()).toEqual([])
    expect(service.getAllSymptoms()).toEqual([])
    expect(service.getMedications()).toEqual([])
  })

  it('returns an empty collection for corrupted local storage arrays', () => {
    localStorage.setItem('sessions', '{bad json')

    expect(new LocalStorageService().getAllSessions()).toEqual([])
  })
})
