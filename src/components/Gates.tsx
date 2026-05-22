import { ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LocalStorageService } from '../services/localStorageService'
import { Field, Panel, PrimaryButton } from './ui'

export function ConsentGate() {
  const storage = useMemo(() => new LocalStorageService(), [])
  const [accepted, setAccepted] = useState(() => storage.hasConsent())

  if (accepted) {
    return <Outlet />
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">
        <Panel title="Consent and local data use">
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <p>
              EndoBridge stores monitoring sessions, questionnaire answers, symptoms, and
              medication reminders locally in this browser for the MVP.
            </p>
            <p>
              AI insight generation is disabled in this slice. When added later, it will require
              a separate serverless proxy request using minimized session data only.
            </p>
            <p>
              Clearing browser data or using the local purge action permanently removes locally
              stored EndoBridge records from this device.
            </p>
          </div>
          <PrimaryButton
            className="mt-5"
            onClick={() => {
              storage.saveConsent()
              setAccepted(true)
            }}
          >
            <ShieldCheck size={18} />
            I understand and agree
          </PrimaryButton>
        </Panel>
      </section>
    </main>
  )
}

export function AgeGate() {
  const storage = useMemo(() => new LocalStorageService(), [])
  const [eligible, setEligible] = useState(() => storage.hasAgeEligibility())
  const [age, setAge] = useState('')
  const [error, setError] = useState('')

  if (eligible) {
    return <Outlet />
  }

  function submitAge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericAge = Number(age)

    if (!Number.isFinite(numericAge) || numericAge < 18) {
      setError('EndoBridge is available only for users 18 and older.')
      return
    }

    storage.saveAgeEligibility()
    setEligible(true)
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <Panel title="Age eligibility">
          <form className="space-y-4" onSubmit={submitAge}>
            <p className="text-sm leading-6 text-slate-600">
              The MVP is limited to adult users. Confirm that you are at least 18 before
              accessing the monitoring workspace.
            </p>
            <Field label="Age" error={error}>
              <input
                aria-label="Age"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                min={0}
                onChange={(event) => {
                  setAge(event.target.value)
                  setError('')
                }}
                type="number"
                value={age}
              />
            </Field>
            <PrimaryButton type="submit">Continue</PrimaryButton>
          </form>
        </Panel>
      </section>
    </main>
  )
}
