import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../context/auth'
import { AppShell } from './AppShell'

const authValue: AuthContextValue = {
  api: {} as AuthContextValue['api'],
  token: 'test-token',
  user: { userId: 'user-1', email: 'ui-check@example.com' },
  termsAccepted: true,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  acceptTerms: vi.fn(),
  logout: vi.fn(),
}

afterEach(cleanup)

function renderAppShell() {
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<p>Dashboard content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AppShell', () => {
  it('uses the current route in the document title', async () => {
    renderAppShell()

    await waitFor(() => expect(document.title).toBe('Your Health Dashboard | EndoBridge'))
  })

  it('treats the mobile navigation as a focus-managed modal dialog', async () => {
    const user = userEvent.setup()
    renderAppShell()

    const openButton = screen.getByRole('button', { name: 'Open navigation' })
    expect(openButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(openButton)

    const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(openButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveFocus()
    expect(openButton.closest('[aria-hidden="true"]')).toHaveAttribute('inert')

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Mobile navigation' })).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })
})
