import { Activity, ArrowRight, Save } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SymptomSeverityBadge } from '../components/SymptomSeverityBadge'
import {
  EmptyState,
  Panel,
  PrimaryButton,
  StatCard,
  StatusBadge,
  fieldControlClass,
} from '../components/ui'
import {
  getSymptomOrder,
  symptomDefinitions,
  symptomSeverityOptions,
} from '../config/symptoms'
import { buildSymptomTrendSummary } from '../engines/symptomTrendEngine'
import { notifyRecordsChanged } from '../context/records'
import { useAuth } from '../context/auth'
import type { LabSession, SymptomEntry, SymptomKey, SymptomSeverity } from '../types/session'

type SymptomFormValues = Record<SymptomKey, SymptomSeverity>
type SymptomNotes = Record<SymptomKey, string>

function createId(prefix: string) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sortSessionsNewestFirst(sessions: LabSession[]) {
  return [...sessions].sort(
    (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp),
  )
}

function defaultSymptomValues(): SymptomFormValues {
  return Object.fromEntries(
    symptomDefinitions.map((definition) => [definition.key, 'none']),
  ) as SymptomFormValues
}

function defaultSymptomNotes(): SymptomNotes {
  return Object.fromEntries(
    symptomDefinitions.map((definition) => [definition.key, '']),
  ) as SymptomNotes
}

function valuesForSession(symptoms: SymptomEntry[], sessionId: string): SymptomFormValues {
  const values = defaultSymptomValues()

  symptomDefinitions.forEach(({ key }) => {
    const latest = symptoms
      .filter((symptom) => symptom.sessionId === sessionId && symptom.symptomKey === key)
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))[0]

    if (latest) {
      values[key] = latest.severity
    }
  })

  return values
}

function notesForSession(symptoms: SymptomEntry[], sessionId: string): SymptomNotes {
  const notes = defaultSymptomNotes()

  symptomDefinitions.forEach(({ key }) => {
    const latest = symptoms
      .filter((symptom) => symptom.sessionId === sessionId && symptom.symptomKey === key)
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))[0]

    if (latest?.note) {
      notes[key] = latest.note
    }
  })

  return notes
}

function symptomsForSession(symptoms: SymptomEntry[], sessionId: string) {
  return symptoms
    .filter((symptom) => symptom.sessionId === sessionId)
    .sort((left, right) => getSymptomOrder(left.symptomKey) - getSymptomOrder(right.symptomKey))
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleString()
}

function activeSymptomCount(symptoms: SymptomEntry[]) {
  return symptoms.filter((symptom) => symptom.severity !== 'none').length
}

export function SymptomsPage() {
  const { api, token } = useAuth()
  const [sessions, setSessions] = useState<LabSession[]>([])
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [values, setValues] = useState<SymptomFormValues>(() => defaultSymptomValues())
  const [notes, setNotes] = useState<SymptomNotes>(() => defaultSymptomNotes())
  const [saveMessage, setSaveMessage] = useState('')

  const selectedSession =
    sessions.find((session) => session.sessionId === selectedSessionId) ?? sessions[0] ?? null
  const trendSummary = buildSymptomTrendSummary(sessions, symptoms)
  const severeCount = symptoms.filter((symptom) => symptom.severity === 'severe').length
  const moderateCount = symptoms.filter((symptom) => symptom.severity === 'moderate').length

  useEffect(() => {
    if (!token) return

    Promise.all([
      api.listRecordData<LabSession>(token, 'lab-sessions'),
      api.listRecordData<SymptomEntry>(token, 'symptoms'),
    ]).then(([nextSessions, nextSymptoms]) => {
      const sortedSessions = sortSessionsNewestFirst(nextSessions)
      const firstSessionId = sortedSessions[0]?.sessionId ?? ''
      setSessions(sortedSessions)
      setSymptoms(nextSymptoms)
      setSelectedSessionId((current) => current || firstSessionId)
      setValues(valuesForSession(nextSymptoms, firstSessionId))
      setNotes(notesForSession(nextSymptoms, firstSessionId))
    })
  }, [api, token])

  function selectSession(sessionId: string) {
    setSelectedSessionId(sessionId)
    setValues(valuesForSession(symptoms, sessionId))
    setNotes(notesForSession(symptoms, sessionId))
    setSaveMessage('')
  }

  function updateSeverity(symptomKey: SymptomKey, severity: SymptomSeverity) {
    setValues((current) => ({
      ...current,
      [symptomKey]: severity,
    }))
    setSaveMessage('')
  }

  function updateNote(symptomKey: SymptomKey, value: string) {
    setNotes((current) => ({
      ...current,
      [symptomKey]: value,
    }))
    setSaveMessage('')
  }

  async function saveSymptomLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedSession || !token) return

    const timestamp = new Date().toISOString()
    const entries = symptomDefinitions.map(({ key }) => ({
      entryId: createId(`symptom-${key}`),
      sessionId: selectedSession.sessionId,
      symptomKey: key,
      severity: values[key],
      note: values[key] === 'none' ? null : notes[key].trim() || null,
      timestamp,
    }))

    const previousEntries = symptoms.filter((symptom) => symptom.sessionId === selectedSession.sessionId)
    await Promise.all([
      ...previousEntries.map((entry) => api.deleteRecord(token, 'symptoms', entry.entryId)),
      ...entries.map((entry) => api.createRecord(token, 'symptoms', entry)),
    ])
    const nextSymptoms = [
      ...symptoms.filter((symptom) => symptom.sessionId !== selectedSession.sessionId),
      ...entries,
    ]
    setSymptoms(nextSymptoms)
    setValues(valuesForSession(nextSymptoms, selectedSession.sessionId))
    setNotes(notesForSession(nextSymptoms, selectedSession.sessionId))
    setSaveMessage('Saved symptom log to your account.')
    notifyRecordsChanged()
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          detail="Saved symptom records"
          icon={<Activity size={18} />}
          label="Total entries"
          value={symptoms.length.toString()}
        />
        <StatCard
          detail="Marked severe"
          icon={<Activity size={18} />}
          label="Severe symptoms"
          tone="amber"
          value={severeCount.toString()}
        />
        <StatCard
          detail="Marked moderate"
          icon={<Activity size={18} />}
          label="Moderate symptoms"
          tone="cyan"
          value={moderateCount.toString()}
        />
      </div>

      <Panel eyebrow="Module 3" title="Symptom tracker">
        {sessions.length === 0 ? (
          <EmptyState title="No completed sessions yet">
            No completed monitoring sessions are stored in your account yet.
            <Link className="ml-1 font-medium text-emerald-700 hover:text-emerald-800" to="/lab">
              Start a lab session
            </Link>
            .
          </EmptyState>
        ) : (
          <form className="space-y-5" onSubmit={saveSymptomLog}>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)]">
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Session</span>
                <select
                  aria-label="Symptom session"
                  className={fieldControlClass}
                  onChange={(event) => selectSession(event.target.value)}
                  value={selectedSession?.sessionId ?? ''}
                >
                  {sessions.map((session) => (
                    <option key={session.sessionId} value={session.sessionId}>
                      {formatDate(session.timestamp)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-[12px] border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-medium">Account-backed tracking</p>
                <p className="mt-1 text-emerald-800">
                  {activeSymptomCount(symptomsForSession(symptoms, selectedSession?.sessionId ?? ''))}{' '}
                  active symptoms in this session.
                </p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {symptomDefinitions.map((symptom) => (
                <label
                  className="block rounded-[12px] border border-slate-200 bg-slate-50 p-3"
                  key={symptom.key}
                >
                  <span className="text-sm font-semibold text-slate-950">{symptom.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {symptom.description}
                  </span>
                  <select
                    aria-label={`${symptom.label === 'Acne' ? 'Acne' : symptom.label} severity`}
                    className={`${fieldControlClass} mt-3`}
                    onChange={(event) =>
                      updateSeverity(symptom.key, event.target.value as SymptomSeverity)
                    }
                    value={values[symptom.key]}
                  >
                    {symptomSeverityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {values[symptom.key] !== 'none' ? (
                    <span className="mt-3 block text-sm font-medium text-slate-700">
                      {symptom.label} note
                      <textarea
                        aria-label={`${symptom.label} note`}
                        className={`${fieldControlClass} mt-1 min-h-20`}
                        onChange={(event) => updateNote(symptom.key, event.target.value)}
                        value={notes[symptom.key]}
                      />
                    </span>
                  ) : null}
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div aria-live="polite">
                {saveMessage ? (
                  <p className="text-sm font-medium text-emerald-700">{saveMessage}</p>
                ) : null}
              </div>
              <PrimaryButton type="submit">
                <Save size={18} />
                Save symptom log
              </PrimaryButton>
            </div>
          </form>
        )}
      </Panel>

      <Panel title="Session comparison">
        {sessions.length < 2 ? (
          <div className="rounded-[12px] bg-slate-50 p-4 text-sm text-slate-600">
            Comparison will be available after your second monitoring session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                  <th className="py-2 pr-3 font-medium">Symptom</th>
                  <th className="py-2 pr-3 font-medium">Previous</th>
                  <th className="py-2 pr-3 font-medium">Current</th>
                  <th className="py-2 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {trendSummary.map((summary) => (
                  <tr className="border-b border-slate-100" key={summary.symptomKey}>
                    <td className="py-3 pr-3 font-medium text-slate-900">{summary.label}</td>
                    <td className="py-3 pr-3">
                      <SymptomSeverityBadge severity={summary.previousSeverity} />
                    </td>
                    <td className="py-3 pr-3">
                      <SymptomSeverityBadge severity={summary.currentSeverity} />
                    </td>
                    <td className="py-3">
                      <StatusBadge
                        tone={
                          summary.trendLabel === 'increased' ||
                          summary.trendLabel === 'newly flagged'
                            ? 'warning'
                            : summary.trendLabel === 'decreased'
                              ? 'success'
                              : 'neutral'
                        }
                      >
                        {summary.trendLabel}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Symptom history">
        {symptoms.length === 0 ? (
          <p className="text-sm text-slate-600">No symptom logs are stored yet.</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const sessionSymptoms = symptomsForSession(symptoms, session.sessionId)

              if (sessionSymptoms.length === 0) return null

              return (
                <article className="rounded-[14px] border border-slate-200 bg-slate-50 p-4" key={session.sessionId}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {formatDate(session.timestamp)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Session ID {session.sessionId.slice(0, 14)}
                      </p>
                    </div>
                    <Link
                      className="inline-flex h-10 items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                      to={`/history/${session.sessionId}`}
                    >
                      View session
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {sessionSymptoms.map((symptom) => (
                      <div className="rounded-[12px] bg-white p-3" key={symptom.entryId}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900">
                            {
                              symptomDefinitions.find(
                                (definition) => definition.key === symptom.symptomKey,
                              )?.label
                            }
                          </p>
                          <SymptomSeverityBadge severity={symptom.severity} />
                        </div>
                        {symptom.note ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">{symptom.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Panel>
    </section>
  )
}
