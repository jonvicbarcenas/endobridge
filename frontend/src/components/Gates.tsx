import { Copy, HeartPulse, KeyRound, ShieldCheck } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { Field, Panel, PrimaryButton, SecondaryButton, fieldControlClass } from './ui'

export function AuthenticatedGate() {
  const { isLoading, token, termsAccepted, recoveryCode, dismissRecoveryCode } = useAuth()

  useEffect(() => {
    if (isLoading) {
      document.title = 'Opening EndoBridge'
    } else if (token && !termsAccepted) {
      document.title = 'Terms & Privacy | EndoBridge'
    }
  }, [isLoading, termsAccepted, token])

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
  if (recoveryCode) {
    return (
      <GateFrame>
        <RecoveryCodeCard code={recoveryCode} onContinue={dismissRecoveryCode} />
      </GateFrame>
    )
  }
  if (!termsAccepted) return <TermsGate />

  return <Outlet />
}

function friendlyAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : ''
  if (message === 'invalid email or password') return 'Email or password is incorrect.'
  if (message === 'email or recovery code is incorrect') return 'The email or recovery code is incorrect. Check the code you saved when you created your account.'
  if (message === 'account already exists') return 'An account with this email already exists. Log in instead, or use "Forgot password?".'
  if (message === 'too many requests') return 'Too many attempts. Wait 15 minutes and try again.'
  if (message === 'invalid credentials request' || message === 'invalid recovery request') return 'Check that the email is valid and the new password has at least 8 characters.'
  if (message === 'Failed to fetch' || message === 'NetworkError when attempting to fetch resource.') return 'Cannot reach EndoBridge. Check your internet connection.'
  return message || fallback
}

function AuthForm() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title =
      mode === 'register'
        ? 'Create Account | EndoBridge'
        : mode === 'recover'
          ? 'Reset Password | EndoBridge'
          : 'Log In | EndoBridge'
  }, [mode])

  if (mode === 'recover') {
    return <RecoverPasswordForm initialEmail={email} onBack={() => setMode('login')} />
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (mode === 'register' && password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.')
      return
    }

    setConfirmPasswordError('')
    setIsSubmitting(true)

    try {
      if (mode === 'register') {
        await register(email, password)
      } else {
        await login(email, password)
      }
    } catch (error) {
      setError(friendlyAuthError(error, 'Unable to log in.'))
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
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </Field>
          <Field
            error={mode === 'register' ? 'Use at least 8 characters.' : undefined}
            label="Password"
          >
            <input
              aria-label="Password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              className={fieldControlClass}
              maxLength={128}
              minLength={mode === 'register' ? 8 : undefined}
              onChange={(event) => {
                setPassword(event.target.value)
                setConfirmPasswordError('')
              }}
              required
              type="password"
              value={password}
            />
          </Field>

          {mode === 'register' ? (
            <Field
              error={confirmPasswordError || undefined}
              errorId="confirm-password-error"
              label="Confirm password"
            >
              <input
                aria-describedby={confirmPasswordError ? 'confirm-password-error' : undefined}
                aria-invalid={confirmPasswordError ? true : undefined}
                aria-label="Confirm password"
                autoComplete="new-password"
                className={fieldControlClass}
                maxLength={128}
                minLength={8}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setConfirmPasswordError('')
                }}
                required
                type="password"
                value={confirmPassword}
              />
            </Field>
          ) : null}

          {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}

          {mode === 'login' ? (
            <button
              className="text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline focus:outline-none focus:ring-4 focus:ring-indigo-100"
              onClick={() => {
                setError('')
                setMode('recover')
              }}
              type="button"
            >
              Forgot password?
            </button>
          ) : null}

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
                setConfirmPassword('')
                setConfirmPasswordError('')
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

function RecoverPasswordForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const { recoverPassword } = useAuth()
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      setNewCode(await recoverPassword(email, code, password))
    } catch (error) {
      setError(friendlyAuthError(error, 'Unable to reset the password.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (newCode) {
    return (
      <GateFrame>
        <RecoveryCodeCard
          code={newCode}
          continueLabel="Go to log in"
          intro="Your password was changed and other devices were signed out. Your old recovery code no longer works. Save this new one."
          onContinue={onBack}
          title="Password reset"
        />
      </GateFrame>
    )
  }

  return (
    <GateFrame>
      <Panel eyebrow="Account recovery" title="Reset your password">
        <p className="mb-4 text-sm leading-6 text-slate-600">
          Enter the recovery code you saved when you created your account (it looks like
          <span className="mx-1 font-mono text-slate-900">ABCD-EFGH-JKLM-NPQR</span>).
          If you no longer have it, contact the EndoBridge administrators.
        </p>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Email address">
            <input
              autoComplete="email"
              className={fieldControlClass}
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </Field>
          <Field label="Recovery code">
            <input
              aria-label="Recovery code"
              autoCapitalize="characters"
              autoComplete="off"
              className={`${fieldControlClass} font-mono uppercase tracking-wider`}
              maxLength={40}
              onChange={(event) => setCode(event.target.value)}
              required
              spellCheck={false}
              value={code}
            />
          </Field>
          <Field error="Use at least 8 characters." label="New password">
            <input
              aria-label="New password"
              autoComplete="new-password"
              className={fieldControlClass}
              maxLength={128}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              aria-label="Confirm new password"
              autoComplete="new-password"
              className={fieldControlClass}
              maxLength={128}
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </Field>
          {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton disabled={isSubmitting} type="submit">
              <KeyRound size={18} />
              {isSubmitting ? 'Please wait...' : 'Reset password'}
            </PrimaryButton>
            <SecondaryButton onClick={onBack} type="button">
              Back to log in
            </SecondaryButton>
          </div>
        </form>
      </Panel>
    </GateFrame>
  )
}

export function RecoveryCodeCard({
  code,
  onContinue,
  title = 'Save your recovery code',
  intro = 'If you ever forget your password, this code lets you set a new one. It is shown only once, so write it down or save it somewhere safe.',
  continueLabel = 'I saved it, continue',
}: {
  code: string
  onContinue: () => void
  title?: string
  intro?: string
  continueLabel?: string
}) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Panel eyebrow="Account recovery" title={title}>
      <p className="text-sm leading-6 text-slate-600">{intro}</p>
      <div className="mt-4 flex flex-col gap-3 rounded-[14px] border-2 border-dashed border-indigo-300 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p aria-label="Recovery code" className="break-all font-mono text-xl font-semibold tracking-wider text-slate-950">
          {code}
        </p>
        <SecondaryButton onClick={copy} type="button">
          <Copy size={16} />
          {copied ? 'Copied' : 'Copy'}
        </SecondaryButton>
      </div>
      <div className="mt-4">
        <ChecklistItem checked={saved} label="I saved my recovery code somewhere safe." onChange={setSaved} />
      </div>
      <PrimaryButton className="mt-4" disabled={!saved} onClick={onContinue} type="button">
        {continueLabel}
      </PrimaryButton>
    </Panel>
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
              Lab sessions, reports, reminders, uploaded lab result files, and daily logs are stored
              in your EndoBridge account. PDF, image, DOCX, and text uploads can be scanned for
              supported biomarker values, and extracted values must be reviewed before saving.
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
    <main className="min-h-screen bg-[#faf6f8] px-4 py-8">
      <h1 className="sr-only">EndoBridge</h1>
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[0.85fr_1fr]">
        <div className="hidden lg:block">
          <div className="rounded-[24px] bg-slate-950 p-8 text-white shadow-xl shadow-slate-300">
            <div className="flex size-12 items-center justify-center rounded-[16px] bg-indigo-500">
              <HeartPulse size={26} />
            </div>
            <p className="mt-8 text-3xl font-semibold leading-10">EndoBridge</p>
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
