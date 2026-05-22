import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App gates', () => {
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
})
