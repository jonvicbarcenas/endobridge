import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../context/auth'
import { AuthenticatedGate } from './Gates'

afterEach(cleanup)

function renderGate(register: AuthContextValue['register']) {
  const authValue: AuthContextValue = {
    api: {} as AuthContextValue['api'],
    token: null,
    user: null,
    termsAccepted: false,
    isLoading: false,
    login: vi.fn(),
    register,
    acceptTerms: vi.fn(),
    logout: vi.fn(),
  }

  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <AuthenticatedGate />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('registration gate', () => {
  it('requires matching password confirmation before registering', async () => {
    const user = userEvent.setup()
    const register = vi.fn().mockResolvedValue(undefined)
    renderGate(register)

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await user.type(screen.getByLabelText('Email address'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'Password123!')
    await user.type(screen.getByLabelText('Confirm password'), 'Different123!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith('person@example.com', 'Password123!'),
    )
  })
})
