import {
  Activity,
  Bell,
  ClipboardList,
  Database,
  Download,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { mandatoryBiomarkers, referenceRanges } from './config/referenceRanges'
import { generateQuestionnaire } from './engines/questionnaireGenerator'
import { scoreSession } from './engines/scoringEngine'
import { validateLabSessionInput } from './engines/validationEngine'
import { createLabSession } from './models/labSession'
import { ExportService } from './services/exportService'
import { LocalStorageService } from './services/localStorageService'
import type { BiomarkerInputMap, LabSession } from './types/session'

const initialBiomarkers: BiomarkerInputMap = {
  ldlC: { value: 130, unit: 'mg/dL' },
  fastingGlucose: { value: 96, unit: 'mg/dL' },
  fastingInsulin: { value: 15, unit: 'uIU/mL' },
  totalTestosterone: { value: 54, unit: 'ng/dL' },
  amh: { value: 7.2, unit: 'ng/mL' },
  lhFshRatio: { value: 2.2, unit: 'ratio' },
  dheas: { value: 250, unit: 'ug/dL' },
}

function App() {
  const storage = useMemo(() => new LocalStorageService(), [])
  const [age, setAge] = useState(28)
  const [bmi, setBmi] = useState(26)
  const [cycleRegularity, setCycleRegularity] = useState('irregular')
  const [biomarkers, setBiomarkers] = useState<BiomarkerInputMap>(initialBiomarkers)
  const [latestSession, setLatestSession] = useState<LabSession | null>(
    () => storage.getAllSessions()[0] ?? null,
  )
  const [message, setMessage] = useState('Local-first MVP foundation. AI generation is scaffolded, not connected.')

  const sessions = storage.getAllSessions()
  const validation = validateLabSessionInput({ age, bmi, cycleRegularity, biomarkers })
  const questionnaire = generateQuestionnaire(
    Object.values(validation.validatedBiomarkers)
      .filter((entry) => entry?.isFlagged)
      .map((entry) => ({
        key: entry.key,
        direction: entry.direction,
      })),
  )

  function updateBiomarker(key: keyof typeof initialBiomarkers, value: number) {
    setBiomarkers((current) => ({
      ...current,
      [key]: {
        value,
        unit: referenceRanges[key].unit,
      },
    }))
  }

  function submitLabSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateLabSessionInput({ age, bmi, cycleRegularity, biomarkers })

    if (!result.isValid) {
      setMessage(result.errors.join('. '))
      return
    }

    const session = createLabSession({ age, bmi, cycleRegularity, biomarkers }, result)
    session.questionnaire = Object.fromEntries(questionnaire.map((question) => [question.id, null]))
    storage.saveSession(session)
    setLatestSession(session)

    const synthesis = scoreSession(session)
    setMessage(
      `Session saved locally. ${synthesis.topContributors.length} top contributor(s) prepared for the proxy payload.`,
    )
  }

  function exportLocalData() {
    new ExportService(storage).exportAll()
  }

  return (
    <main className="min-h-screen bg-[#f7faf8]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
              EndoBridge
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">
              PCOS monitoring workspace
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Foundation build for local lab entry, deterministic flagging, questionnaire
              generation, local history, and the Gemini proxy boundary described in the SRS/SDD.
            </p>
          </div>
          <button
            type="button"
            onClick={exportLocalData}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Download size={18} />
            Export JSON
          </button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric icon={Database} label="Stored sessions" value={sessions.length.toString()} />
          <Metric icon={ShieldCheck} label="Storage mode" value="Local only" />
          <Metric icon={Activity} label="Flags now" value={validation.flags.length.toString()} />
          <Metric icon={Bell} label="Reminders" value="Scaffolded" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <form
            onSubmit={submitLabSession}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="text-emerald-700" size={20} />
              <h2 className="text-lg font-semibold text-slate-950">Lab result entry</h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Age">
                <input
                  min={18}
                  type="number"
                  value={age}
                  onChange={(event) => setAge(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </Field>
              <Field label="BMI">
                <input
                  type="number"
                  value={bmi}
                  onChange={(event) => setBmi(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </Field>
              <Field label="Cycle regularity">
                <select
                  value={cycleRegularity}
                  onChange={(event) => setCycleRegularity(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="regular">Regular</option>
                  <option value="irregular">Irregular</option>
                  <option value="missed">Missed</option>
                  <option value="unknown">Unknown</option>
                </select>
              </Field>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {mandatoryBiomarkers.map((key) => {
                const range = referenceRanges[key]
                const entry = validation.validatedBiomarkers[key]
                return (
                  <Field key={key} label={`${range.label} (${range.unit})`}>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={biomarkers[key]?.value ?? ''}
                        onChange={(event) => updateBiomarker(key, Number(event.target.value))}
                        className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2"
                      />
                      <span
                        className={`inline-flex min-w-20 items-center justify-center rounded-md px-2 text-xs font-medium ${
                          entry?.isFlagged
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {entry?.isFlagged ? entry.direction : 'ok'}
                      </span>
                    </div>
                  </Field>
                )
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">{message}</p>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800"
              >
                <ClipboardList size={18} />
                Save Session
              </button>
            </div>
          </form>

          <aside className="flex flex-col gap-4">
            <Panel title="Contextual questionnaire">
              {questionnaire.length === 0 ? (
                <p className="text-sm text-slate-600">No contextual questions for current values.</p>
              ) : (
                <ul className="space-y-3">
                  {questionnaire.map((question) => (
                    <li key={question.id} className="rounded-md bg-slate-50 p-3">
                      <p className="text-sm font-medium text-slate-900">{question.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{question.type}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Latest local session">
              {latestSession ? (
                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-900">ID:</span>{' '}
                    {latestSession.sessionId.slice(0, 14)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Status:</span>{' '}
                    {latestSession.status}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Saved:</span>{' '}
                    {new Date(latestSession.timestamp).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">No session saved on this browser yet.</p>
              )}
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={18} />
        <span className="text-xs font-medium uppercase tracking-normal">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default App
