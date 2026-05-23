import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { validateLabSessionInput } from './engines/validationEngine'
import { createLabSession } from './models/labSession'
import { LocalStorageService } from './services/localStorageService'
import type { LabSessionInput } from './types/session'

const validInput: LabSessionInput = {
  age: 28,
  bmi: 26.4,
  cycleRegularity: 'irregular',
  biomarkers: {
    ldlC: { value: 130, unit: 'mg/dL' },
    fastingGlucose: { value: 96, unit: 'mg/dL' },
    fastingInsulin: { value: 15, unit: 'uIU/mL' },
    totalTestosterone: { value: 54, unit: 'ng/dL' },
    amh: { value: 7.2, unit: 'ng/mL' },
    lhFshRatio: { value: 2.2, unit: 'ratio' },
    dheas: { value: 250, unit: 'ug/dL' },
  },
}

describe('App gates', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  it('requires consent and adult age confirmation before opening the lab workspace', () => {
    render(<App />)

    expect(screen.getByText('Consent and local data use')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /I understand and agree/i }))

    expect(screen.getByText('Age eligibility')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '17' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    expect(screen.getByText(/EndoBridge is available only for users 18 and older/i)).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '28' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    expect(screen.getByText('Lab result entry')).toBeTruthy()
  })

  it('saves a lab session with questionnaire responses', () => {
    const storage = new LocalStorageService()
    storage.saveConsent()
    storage.saveAgeEligibility()

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Continue to questionnaire/i }))

    expect(screen.getByText('Contextual questionnaire')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Cycle pattern during this monitoring period/i), {
      target: { value: 'irregular' },
    })
    fireEvent.change(screen.getByLabelText(/Lifestyle context relevant to lipid tracking/i), {
      target: { value: 'No major diet or activity changes this month.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save session/i }))

    const sessions = storage.getAllSessions()

    expect(screen.getByText('Session detail')).toBeTruthy()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].questionnaire).toEqual({
      'cycle-pattern': 'irregular',
      'cardio-context': 'No major diet or activity changes this month.',
    })
  })

  it('shows history detail and clears local data back to the consent gate', () => {
    const storage = new LocalStorageService()
    storage.saveConsent()
    storage.saveAgeEligibility()
    storage.saveSession(
      createLabSession(validInput, validateLabSessionInput(validInput), {
        'cycle-pattern': 'irregular',
      }),
    )
    window.history.pushState({}, '', '/history')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App />)

    expect(screen.getByText('Session history')).toBeTruthy()
    expect(screen.getByText('1 stored session')).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: /View details/i }))

    expect(screen.getByText('Deterministic contributors')).toBeTruthy()
    expect(screen.getByText('cycle-pattern')).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: /Back to history/i }))
    fireEvent.click(screen.getByRole('button', { name: /Clear local data/i }))

    expect(storage.getAllSessions()).toEqual([])
    expect(screen.getByText('Consent and local data use')).toBeTruthy()

    confirmSpy.mockRestore()
  })

  it('shows active medication reminder context from history detail', () => {
    const storage = new LocalStorageService()
    storage.saveConsent()
    storage.saveAgeEligibility()
    storage.saveSession(
      createLabSession(validInput, validateLabSessionInput(validInput), {
        'cycle-pattern': 'irregular',
      }),
    )
    storage.saveMedication({
      medId: 'med-1',
      name: 'Metformin',
      dosage: '500mg',
      scheduleTime: '08:00',
      frequency: 'daily',
      createdAt: '2026-05-23T00:00:00.000Z',
      nextReminderAt: '2026-05-23T08:00:00.000Z',
      isActive: true,
    })
    window.history.pushState({}, '', '/history')

    render(<App />)

    expect(screen.getByText('1 active medication')).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: /View details/i }))

    expect(screen.getByText('Medication reminder context')).toBeTruthy()
    expect(screen.getByText('1 active local reminder')).toBeTruthy()
  })

  it('generates and stores a local insight report from the session detail page', async () => {
    const storage = new LocalStorageService()
    storage.saveConsent()
    storage.saveAgeEligibility()
    const session = createLabSession(validInput, validateLabSessionInput(validInput), {
      'cycle-pattern': 'irregular',
    })
    storage.saveSession(session)
    storage.saveMedication({
      medId: 'med-1',
      name: 'Metformin',
      dosage: '500mg',
      scheduleTime: '08:00',
      frequency: 'daily',
      createdAt: '2026-05-23T00:00:00.000Z',
      nextReminderAt: '2026-05-23T08:00:00.000Z',
      isActive: true,
    })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          observationalSummary:
            'Several submitted biomarkers were above their reference ranges in this session.',
          observations: ['LDL cholesterol and AMH were both flagged above range.'],
          contributors: [],
          reportTimestamp: '2026-05-23T01:02:03.000Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)
    window.history.pushState({}, '', `/history/${session.sessionId}`)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Generate insight report/i }))

    expect(await screen.findByText('Insight report')).toBeTruthy()
    expect(screen.getByText(/Several submitted biomarkers/i)).toBeTruthy()
    expect(screen.getByText(/This output does not constitute a clinical diagnosis/i)).toBeTruthy()
    expect(screen.getByText(/DOH-NCMH Crisis Hotline/i)).toBeTruthy()
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).not.toMatch(/Metformin|dosage|scheduleTime/i)

    fireEvent.click(screen.getByRole('button', { name: /Print report/i }))

    expect(printSpy).toHaveBeenCalled()
    expect(storage.getSession(session.sessionId)?.insightReport).toEqual(
      expect.objectContaining({
        observationalSummary:
          'Several submitted biomarkers were above their reference ranges in this session.',
        reportTimestamp: '2026-05-23T01:02:03.000Z',
      }),
    )
  })

  it('logs local symptom statuses against a selected session', () => {
    const storage = new LocalStorageService()
    storage.saveConsent()
    storage.saveAgeEligibility()
    const session = createLabSession(validInput, validateLabSessionInput(validInput), {
      'cycle-pattern': 'irregular',
    })
    storage.saveSession(session)
    window.history.pushState({}, '', '/symptoms')

    render(<App />)

    expect(screen.getByText('Symptom tracker')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Acne severity'), {
      target: { value: 'moderate' },
    })
    fireEvent.change(screen.getByLabelText('Fatigue severity'), {
      target: { value: 'severe' },
    })
    fireEvent.change(screen.getByLabelText('Fatigue note'), {
      target: { value: 'Fatigue was worse after poor sleep.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save symptom log/i }))

    expect(screen.getByText('Saved symptom log for the selected session.')).toBeTruthy()
    expect(storage.getSymptomsForSession(session.sessionId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionId: session.sessionId,
          symptomKey: 'acne',
          severity: 'moderate',
          note: null,
        }),
        expect.objectContaining({
          sessionId: session.sessionId,
          symptomKey: 'fatigue',
          severity: 'severe',
          note: 'Fatigue was worse after poor sleep.',
        }),
      ]),
    )
  })

  it('shows session-linked symptom entries from history detail', () => {
    const storage = new LocalStorageService()
    storage.saveConsent()
    storage.saveAgeEligibility()
    const session = createLabSession(validInput, validateLabSessionInput(validInput), {
      'cycle-pattern': 'irregular',
    })
    storage.saveSession(session)
    storage.saveSymptom({
      entryId: 'symptom-acne',
      sessionId: session.sessionId,
      symptomKey: 'acne',
      severity: 'moderate',
      note: 'Acne increased this week.',
      timestamp: session.timestamp,
    })
    window.history.pushState({}, '', '/history')

    render(<App />)

    expect(screen.getByText('1 active symptom')).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: /View details/i }))

    expect(screen.getByText('Session symptoms')).toBeTruthy()
    expect(screen.getByText('Acne')).toBeTruthy()
    expect(screen.getByText('Acne increased this week.')).toBeTruthy()
  })

  it('manages local medication reminders and asks notification permission only after opt-in', async () => {
    const storage = new LocalStorageService()
    storage.saveConsent()
    storage.saveAgeEligibility()
    const requestPermission = vi.fn().mockResolvedValue('denied')
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission,
    })
    window.history.pushState({}, '', '/medications')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App />)

    expect(screen.getByText(/Medication entries are user-managed/i)).toBeTruthy()
    expect(requestPermission).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Medication name'), {
      target: { value: 'Metformin' },
    })
    fireEvent.change(screen.getByLabelText('Dosage'), {
      target: { value: '500mg' },
    })
    fireEvent.change(screen.getByLabelText('Schedule time'), {
      target: { value: '08:00' },
    })
    fireEvent.change(screen.getByLabelText('Frequency'), {
      target: { value: 'daily' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save reminder/i }))

    expect(screen.getByText('Metformin')).toBeTruthy()
    expect(screen.getByText('500mg')).toBeTruthy()
    expect(storage.getMedications()).toEqual([
      expect.objectContaining({
        name: 'Metformin',
        dosage: '500mg',
        scheduleTime: '08:00',
        frequency: 'daily',
        isActive: true,
      }),
    ])
    expect(requestPermission).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Enable browser alerts/i }))

    expect(requestPermission).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/Using in-app reminders/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Edit Metformin/i }))
    fireEvent.change(screen.getByLabelText('Dosage'), {
      target: { value: '850mg' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save reminder/i }))

    expect(storage.getMedications()[0].dosage).toBe('850mg')

    fireEvent.click(screen.getByRole('button', { name: /Pause Metformin/i }))

    expect(storage.getMedications()[0].isActive).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: /Delete Metformin/i }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(storage.getMedications()).toEqual([])
  })
})
