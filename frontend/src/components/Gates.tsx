import { HeartPulse, ShieldCheck } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { Field, Panel, PrimaryButton, SecondaryButton, fieldControlClass } from './ui'

export function AuthenticatedGate() {
  const { isLoading, token, termsAccepted } = useAuth()

  if (isLoading) {
    return (
      <GateFrame>
        <Panel title="Opening EndoBridge">
          <p className="text-sm text-slate-600">Checking your secure session...</p>
        </Panel>
      </GateFrame>
    )
  }

  if (!token) return <AuthForm />
  if (!termsAccepted) return <TermsGate />

  return <Outlet />
}

function AuthForm() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (mode === 'register') {
        await register(email, password)
      } else {
        await login(email, password)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to authenticate.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GateFrame>
      <Panel eyebrow="Secure access" title={mode === 'register' ? 'Create your account' : 'Log in to EndoBridge'}>
        <div className="mb-5 flex items-start gap-3 rounded-[14px] border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
          <HeartPulse className="mt-0.5 shrink-0" size={18} />
          <p>
            EndoBridge stores PCOS monitoring records in your EndoBridge account. The browser only
            keeps a session token for your current login.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <Field label="Email address">
            <input
              autoComplete="email"
              className={fieldControlClass}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </Field>
          <Field
            error={mode === 'register' ? 'Use at least 8 characters.' : undefined}
            label="Password"
          >
            <input
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              className={fieldControlClass}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </Field>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton disabled={isSubmitting} type="submit">
              {isSubmitting
                ? 'Please wait...'
                : mode === 'register'
                  ? 'Create account'
                  : 'Log in'}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setError('')
                setMode(mode === 'register' ? 'login' : 'register')
              }}
              type="button"
            >
              {mode === 'register' ? 'Use existing account' : 'Create account'}
            </SecondaryButton>
          </div>
        </form>
      </Panel>
    </GateFrame>
  )
}

function TermsGate() {
  const { acceptTerms } = useAuth()
  const [confirmed, setConfirmed] = useState({
    terms: false,
    privacy: false,
    age: false,
    disclaimer: false,
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const allConfirmed = Object.values(confirmed).every(Boolean)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!allConfirmed) {
      setError('Confirm every required item before continuing.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await acceptTerms()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save terms acceptance.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GateFrame>
      <Panel eyebrow="Required before using the workspace" title="Terms, privacy consent, and safety disclaimer">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              EndoBridge is a personal PCOS monitoring web app for organizing lab results,
              symptoms, medication reminders, daily wellness logs, and observational reports over
              time.
            </p>
            <p>
              The system does not diagnose PCOS, prescribe medication, validate prescriptions,
              change dosage, or provide treatment, diet, or exercise advice. Gemini-generated
              reports must stay plain-language and observational.
            </p>
            <p>
              Lab sessions, reports, reminders, uploaded PDF records, and daily logs are stored in
              your EndoBridge account. PDF uploads can be scanned for supported biomarker values,
              and extracted values must be reviewed before saving.
            </p>
          </div>

          <ChecklistItem
            checked={confirmed.terms}
            label="I accept the EndoBridge Terms of Use."
            onChange={(value) => setConfirmed((current) => ({ ...current, terms: value }))}
          />
          <ChecklistItem
            checked={confirmed.privacy}
            label="I consent to secure account storage for my submitted monitoring records."
            onChange={(value) => setConfirmed((current) => ({ ...current, privacy: value }))}
          />
          <ChecklistItem
            checked={confirmed.age}
            label="I confirm that I am at least 18 years old."
            onChange={(value) => setConfirmed((current) => ({ ...current, age: value }))}
          />
          <ChecklistItem
            checked={confirmed.disclaimer}
            label="I understand that EndoBridge is not medical advice and should not replace a licensed clinician."
            onChange={(value) => setConfirmed((current) => ({ ...current, disclaimer: value }))}
          />

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <PrimaryButton disabled={isSubmitting} type="submit">
            <ShieldCheck size={18} />
            {isSubmitting ? 'Saving acceptance...' : 'Accept and continue'}
          </PrimaryButton>
        </form>
      </Panel>
    </GateFrame>
  )
}

function ChecklistItem({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-11 items-start gap-3 rounded-[12px] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/40">
      <input
        checked={checked}
        className="mt-1 size-4"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  )
}

function GateFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[0.85fr_1fr]">
        <div className="hidden lg:block">
          <div className="rounded-[24px] bg-slate-950 p-8 text-white shadow-xl shadow-slate-300">
            <div className="flex size-12 items-center justify-center rounded-[16px] bg-indigo-500">
              <HeartPulse size={26} />
            </div>
            <h1 className="mt-8 text-3xl font-semibold leading-10">EndoBridge</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Account-backed PCOS monitoring for lab results, symptoms, medication reminders,
              daily logs, and observational reports.
            </p>
            <div className="mt-8 rounded-[16px] border border-white/10 bg-white/10 p-4 text-sm leading-6 text-slate-200">
              Non-diagnostic by design. The system organizes user-submitted monitoring data and
              avoids prescriptions, diagnosis, and treatment advice.
            </div>
          </div>
        </div>
        <div>{children}</div>
      </section>
    </main>
  )
}
