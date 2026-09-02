import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../context/auth'
import { SessionDraftContext, type SessionDraftContextValue } from '../context/sessionDraft'
import { LabEntryPage } from './LabEntryPage'

const authValue: AuthContextValue = {
  api: {
    listRecordData: vi.fn().mockResolvedValue([]),
  } as unknown as AuthContextValue['api'],
  token: null,
  user: null,
  termsAccepted: true,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  acceptTerms: vi.fn(),
  logout: vi.fn(),
}

const draftValue: SessionDraftContextValue = {
  draft: null,
  setDraft: vi.fn(),
  clearDraft: vi.fn(),
}

afterEach(cleanup)

function renderLabEntryPage() {
  render(
    <AuthContext.Provider value={authValue}>
      <SessionDraftContext.Provider value={draftValue}>
        <MemoryRouter>
          <LabEntryPage />
        </MemoryRouter>
      </SessionDraftContext.Provider>
    </AuthContext.Provider>,
  )
}

describe('LabEntryPage', () => {
  it('starts with an empty patient form instead of sample values', () => {
    renderLabEntryPage()

    expect(screen.getByLabelText('Age')).toHaveValue(null)
    expect(screen.getByLabelText('Weight in kilograms')).toHaveValue(null)
    expect(screen.getByLabelText('Height in centimeters')).toHaveValue(null)
    expect(screen.getByLabelText('BMI auto-calculated')).toHaveValue('')
    expect(screen.getByLabelText('Cycle regularity')).toHaveValue('')

    expect(screen.getByLabelText('LDL-C')).toHaveValue(null)
    expect(screen.getByLabelText('Fasting glucose')).toHaveValue(null)
    expect(screen.getByLabelText('Fasting insulin')).toHaveValue(null)
    expect(screen.getByLabelText('Total testosterone')).toHaveValue(null)
    expect(screen.getByLabelText('AMH')).toHaveValue(null)
    expect(screen.getByLabelText('LH/FSH ratio')).toHaveValue(null)
    expect(screen.getByLabelText('DHEAS')).toHaveValue(null)

    expect(screen.queryByText('within expected range')).not.toBeInTheDocument()
    expect(screen.queryByText('above expected range')).not.toBeInTheDocument()
    expect(screen.queryByText('below expected range')).not.toBeInTheDocument()
    expect(screen.queryByText('review value')).not.toBeInTheDocument()
  })

  it('announces validation errors, links them to fields, and focuses the first invalid field', async () => {
    const user = userEvent.setup()
    renderLabEntryPage()

    await user.click(screen.getByRole('button', { name: 'Continue to questionnaire' }))

    const ageInput = screen.getByLabelText('Age')
    await waitFor(() => expect(ageInput).toHaveFocus())
    expect(ageInput).toHaveAttribute('aria-invalid', 'true')
    expect(ageInput).toHaveAttribute('aria-describedby', 'age-error')

    const errorSummary = screen.getByRole('alert')
    expect(errorSummary).toHaveTextContent('8 blocking errors found')
    expect(errorSummary).not.toHaveTextContent('ldlC')

    const glucoseError = within(errorSummary).getByRole('link', {
      name: 'Fasting glucose is required.',
    })
    await user.click(glucoseError)
    expect(screen.getByLabelText('Fasting glucose')).toHaveFocus()
  })
})
