import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../context/auth'
import { DailyLogsPage } from './DailyLogsPage'

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

afterEach(cleanup)

describe('DailyLogsPage', () => {
  it('exposes section and chip selection states to assistive technology', async () => {
    const user = userEvent.setup()
    render(
      <AuthContext.Provider value={authValue}>
        <DailyLogsPage />
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'How is today going?' })).toBeVisible()

    const bodySection = screen.getByRole('button', { name: 'Body signals' })
    const rhythmSection = screen.getByRole('button', { name: 'Daily rhythm' })
    expect(bodySection).toHaveAttribute('aria-pressed', 'true')
    expect(rhythmSection).toHaveAttribute('aria-pressed', 'false')

    const noCycleEvent = screen.getByRole('button', { name: 'No cycle event' })
    expect(noCycleEvent).toHaveAttribute('aria-pressed', 'false')
    await user.click(noCycleEvent)
    expect(noCycleEvent).toHaveAttribute('aria-pressed', 'true')

    await user.click(rhythmSection)
    expect(bodySection).toHaveAttribute('aria-pressed', 'false')
    expect(rhythmSection).toHaveAttribute('aria-pressed', 'true')
  })
})
