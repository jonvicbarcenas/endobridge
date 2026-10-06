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
    expect(screen.queryByLabelText('Cycle regularity')).not.toBeInTheDocument()

    expect(screen.getByLabelText('LDL-C (bad cholesterol)')).toHaveValue(null)
    expect(screen.getByLabelText('Total cholesterol')).toHaveValue(null)
    expect(screen.getByLabelText('HDL-C (good cholesterol)')).toHaveValue(null)
    expect(screen.getByLabelText('Triglycerides')).toHaveValue(null)
    expect(screen.getByLabelText('Fasting glucose')).toHaveValue(null)
    expect(screen.queryByLabelText('Fasting insulin')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Total testosterone')).toHaveValue(null)
    expect(screen.getByLabelText('TSH')).toHaveValue(null)
    expect(screen.getByLabelText('Free T3')).toHaveValue(null)
    expect(screen.getByLabelText('Free T4')).toHaveValue(null)
    expect(screen.getByLabelText('HbA1c')).toHaveValue(null)
    expect(screen.queryByLabelText('Glucose testing selected by clinician')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('AMH')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('LH/FSH ratio')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('DHEAS')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Lab min')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Lab max')).not.toBeInTheDocument()

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
    expect(errorSummary).toHaveTextContent('13 blocking errors found')
    expect(errorSummary).not.toHaveTextContent('ldlC')

    const glucoseError = within(errorSummary).getByRole('link', {
      name: 'Fasting glucose is required.',
    })
    await user.click(glucoseError)
    expect(screen.getByLabelText('Fasting glucose')).toHaveFocus()
  })

  it('submits the fixed ten-value panel without a glucose-test selection', async () => {
    const user = userEvent.setup()
    vi.mocked(draftValue.setDraft).mockClear()
    renderLabEntryPage()

    for (const [label, value] of [
      ['Age', '28'], ['Weight in kilograms', '65'], ['Height in centimeters', '160'],
      ['Total testosterone', '55'], ['Triglycerides', '130'], ['Fasting glucose', '94'],
      ['Total cholesterol', '190'], ['HDL-C (good cholesterol)', '55'],
      ['LDL-C (bad cholesterol)', '110'], ['TSH', '2'], ['Free T3', '3'],
      ['Free T4', '1.2'], ['HbA1c', '5.3'],
    ]) {
      await user.type(screen.getByLabelText(label), value)
    }
    await user.click(screen.getByRole('button', { name: 'Continue to questionnaire' }))

    expect(draftValue.setDraft).toHaveBeenCalledOnce()
    const draft = vi.mocked(draftValue.setDraft).mock.calls[0][0]
    expect(draft.input.panelVersion).toBe('fixed-ten')
    expect(draft.input.glucoseTest).toBeUndefined()
    expect(Object.keys(draft.input.biomarkers)).toEqual([
      'totalTestosterone', 'triglycerides', 'fastingGlucose', 'totalCholesterol',
      'hdlC', 'ldlC', 'tsh', 'freeT3', 'freeT4', 'hba1c',
    ])
  })
})
