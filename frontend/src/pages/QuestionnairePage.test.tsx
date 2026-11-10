import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { questionBank } from '../config/questionBank'
import { AuthContext, type AuthContextValue } from '../context/auth'
import { SessionDraftContext, type SessionDraft } from '../context/sessionDraft'
import { validateLabSessionInput } from '../engines/validationEngine'
import { QuestionnairePage } from './QuestionnairePage'

const input = {
  age: 28,
  weightKg: 65,
  heightCm: 160,
  bmi: 25.4,
  panelVersion: 'fixed-ten' as const,
  biomarkers: {
    totalTestosterone: { value: 55, unit: 'ng/dL' },
    triglycerides: { value: 130, unit: 'mg/dL' },
    fastingGlucose: { value: 94, unit: 'mg/dL' },
    totalCholesterol: { value: 190, unit: 'mg/dL' },
    hdlC: { value: 55, unit: 'mg/dL' },
    ldlC: { value: 110, unit: 'mg/dL' },
    tsh: { value: 2, unit: 'mIU/L' },
    freeT3: { value: 3, unit: 'pg/mL' },
    freeT4: { value: 1.2, unit: 'ng/dL' },
    hba1c: { value: 5.3, unit: '%' },
  },
}
const draft: SessionDraft = { input, validation: validateLabSessionInput(input) }

afterEach(cleanup)

function renderQuestionnaire(currentDraft = draft) {
  const createRecord = vi.fn().mockResolvedValue({})
  const clearDraft = vi.fn()
  const authValue: AuthContextValue = {
    api: { createRecord } as unknown as AuthContextValue['api'],
    token: 'test-token',
    user: null,
    termsAccepted: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    acceptTerms: vi.fn(),
    logout: vi.fn(),
    recoveryCode: null,
    dismissRecoveryCode: vi.fn(),
    recoverPassword: vi.fn(),
    regenerateRecoveryCode: vi.fn(),
  }

  render(
    <AuthContext.Provider value={authValue}>
      <SessionDraftContext.Provider value={{ draft: currentDraft, setDraft: vi.fn(), clearDraft }}>
        <MemoryRouter initialEntries={['/questionnaire']}>
          <Routes>
            <Route path="/questionnaire" element={<QuestionnairePage />} />
            <Route path="/history/:id" element={<p>Saved session</p>} />
          </Routes>
        </MemoryRouter>
      </SessionDraftContext.Provider>
    </AuthContext.Provider>,
  )

  return { createRecord, clearDraft }
}

describe('QuestionnairePage', () => {
  it('starts at cycle questions and shows supplied measurements only in the summary', async () => {
    const user = userEvent.setup()
    renderQuestionnaire()

    expect(screen.getByRole('heading', { name: 'Cycle pattern' })).toBeInTheDocument()
    expect(screen.queryByText('Profile measurements')).not.toBeInTheDocument()
    for (const label of ['What is your age?', 'What is your current weight (kg)?', 'What is your height (cm)?']) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    }
    expect(screen.getByText('28')).toBeInTheDocument()
    expect(screen.getByText('65 kg')).toBeInTheDocument()
    expect(screen.getByText('160 cm')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('0% required answers complete')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next section' }))
    expect(screen.getByText(/Please answer the required question/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cycle pattern' })).toBeInTheDocument()
  })

  it('keeps missing measurements available for drafts without weight or height', () => {
    renderQuestionnaire({ ...draft, input: { ...input, weightKg: undefined, heightCm: undefined } })

    expect(screen.getByRole('heading', { name: 'Profile measurements' })).toBeInTheDocument()
    expect(screen.queryByLabelText('What is your age?')).not.toBeInTheDocument()
    expect(screen.getByLabelText('What is your current weight (kg)?')).toHaveValue(null)
    expect(screen.getByLabelText('What is your height (cm)?')).toHaveValue(null)
  })

  it('saves the carried-over measurements with questionnaire answers after completing all sections', async () => {
    const user = userEvent.setup()
    const { createRecord, clearDraft } = renderQuestionnaire()
    expect(draft.validation.isValid).toBe(true)

    for (let pageIndex = 0; pageIndex < 5; pageIndex += 1) {
      for (const question of questionBank) {
        const field = screen.queryByLabelText(question.label)
        if (!field) continue
        if (question.type === 'select') {
          await user.selectOptions(field, question.options![0])
        } else if (question.type === 'date') {
          await user.type(field, '2026-10-01')
        } else if (question.type === 'number') {
          await user.type(field, '8')
        } else if (question.type === 'text') {
          await user.type(field, 'No additional concerns')
        }
      }
      for (const checkbox of screen.queryAllByRole('checkbox')) {
        await user.click(checkbox)
      }

      const next = screen.queryByRole('button', { name: 'Next section' })
      if (!next) break
      await user.click(next)
    }

    await user.click(screen.getByRole('button', { name: 'Save session' }))
    expect(await screen.findByText('Saved session')).toBeInTheDocument()
    expect(createRecord).toHaveBeenCalledOnce()
    expect(createRecord).toHaveBeenCalledWith('test-token', 'lab-sessions', expect.objectContaining({
      supplementary: expect.objectContaining({ age: 28, weightKg: 65, heightCm: 160, bmi: 25.4 }),
      questionnaire: expect.objectContaining({
        'q1-age': 28,
        'q2-current-weight': 65,
        'q3-height': 160,
        'q4-cycle-regularity-3-months': 'Yes',
      }),
    }))
    expect(clearDraft).toHaveBeenCalledOnce()
  })
})
