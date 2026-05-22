import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { LocalStorageService } from './services/localStorageService'

describe('App gates', () => {
  afterEach(() => {
    cleanup()
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

    expect(sessions).toHaveLength(1)
    expect(sessions[0].questionnaire).toEqual({
      'cycle-pattern': 'irregular',
      'cardio-context': 'No major diet or activity changes this month.',
    })
  })
})
