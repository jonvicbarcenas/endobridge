import { Save } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Field, Panel, PrimaryButton, SecondaryButton, fieldControlClass } from '../components/ui'
import type { QuestionDefinition } from '../config/questionBank'
import { generateQuestionnaire } from '../engines/questionnaireGenerator'
import { createLabSession } from '../models/labSession'
import { notifyRecordsChanged } from '../context/records'
import { useAuth } from '../context/auth'
import { useSessionDraft } from '../context/sessionDraft'
import type { MedicationRecord, QuestionnaireResponse } from '../types/session'

type ResponseDraft = Record<string, string | string[]>

const sectionLabels: Record<QuestionDefinition['level'], string> = {
  base: 'Base questions',
  'flag-follow-up': 'Priority follow-up questions',
  'biomarker-based': 'Biomarker-based questions',
  'daily-context': 'Optional daily context',
  'medication-adherence': 'Medication adherence',
}

function isMissingRequired(question: QuestionDefinition, value: string | string[] | undefined) {
  if (!question.required) return false
  if (Array.isArray(value)) return value.length === 0
  return !value?.trim()
}

function groupedQuestions(questions: QuestionDefinition[]) {
  return questions.reduce(
    (groups, question) => {
      groups[question.level] = [...(groups[question.level] ?? []), question]
      return groups
    },
    {} as Partial<Record<QuestionDefinition['level'], QuestionDefinition[]>>,
  )
}

export function QuestionnairePage() {
  const navigate = useNavigate()
  const { api, token } = useAuth()
  const { draft, clearDraft } = useSessionDraft()
  const [responses, setResponses] = useState<ResponseDraft>(() => {
    if (!draft) return {} as ResponseDraft
    const defaultResponses: ResponseDraft = { 'q1-age': String(draft.input.age) }
    return defaultResponses
  })
  const [includeDailyContext, setIncludeDailyContext] = useState(false)
  const [hasMedicationRecords, setHasMedicationRecords] = useState(false)
  const [error, setError] = useState('')
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null)

  const questions = useMemo(() => {
    if (!draft) return []

    const flags = Object.values(draft.validation.validatedBiomarkers)
        .filter((entry) => entry?.isFlagged)
        .map((entry) => ({
          key: entry.key,
          direction: entry.direction,
        }))

    return generateQuestionnaire({
      biomarkers: draft.validation.validatedBiomarkers,
      flags,
      includeDailyContext,
      hasMedicationRecords,
    })
  }, [draft, hasMedicationRecords, includeDailyContext])

  const questionGroups = useMemo(() => groupedQuestions(questions), [questions])

  useEffect(() => {
    if (!token) return
    api
      .listRecordData<MedicationRecord>(token, 'medications')
      .then((records) => setHasMedicationRecords(records.length > 0))
      .catch(() => setHasMedicationRecords(false))
  }, [api, token])

  if (!draft) {
    if (completedSessionId) {
      return <Navigate replace to={`/history/${completedSessionId}`} />
    }

    return <Navigate replace to="/lab" />
  }

  const activeDraft = draft

  function normalizedResponses(): QuestionnaireResponse {
    return Object.fromEntries(
      questions.map((question) => {
        const value = responses[question.id]

        if (Array.isArray(value)) {
          return [question.id, value.length > 0 ? value : null]
        }

        if (question.type === 'number') {
          return [question.id, value ? Number(value) : null]
        }

        return [question.id, value?.trim() || null]
      }),
    )
  }

  async function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const missing = questions.some((question) => isMissingRequired(question, responses[question.id]))

    if (missing) {
      setError('Answer all required questionnaire items before saving the session.')
      return
    }

    const session = createLabSession(activeDraft.input, activeDraft.validation, normalizedResponses())
    if (token) {
      await api.createRecord(token, 'lab-sessions', session)
    }
    setCompletedSessionId(session.sessionId)
    clearDraft()
    notifyRecordsChanged()
    navigate(`/history/${session.sessionId}`)
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]" onSubmit={saveSession}>
      <Panel eyebrow="Module 1" title="Standard questionnaire">
        <p className="text-sm leading-6 text-slate-600">
          These questions come from EndoBridge's predefined questionnaire bank. Biomarker values
          only decide which fixed questions are displayed; AI does not create questions.
        </p>

        <div className="mt-5 flex flex-wrap gap-2 border-y border-slate-200 py-4">
          <SecondaryButton
            onClick={() => setIncludeDailyContext((current) => !current)}
            type="button"
          >
            {includeDailyContext ? 'Remove daily context' : 'Add daily context'}
          </SecondaryButton>
        </div>

        <div className="mt-5 space-y-7">
          {Object.entries(questionGroups).map(([level, groupQuestions]) => (
            <section className="space-y-4" key={level}>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  {sectionLabels[level as QuestionDefinition['level']]}
                </h2>
                <p className="text-xs text-slate-500">
                  {groupQuestions.length} {groupQuestions.length === 1 ? 'question' : 'questions'}
                </p>
              </div>
              {groupQuestions.map((question) => (
                <QuestionField
                  key={question.id}
                  onChange={(value) => {
                    setError('')
                    setResponses((current) => ({
                      ...current,
                      [question.id]: value,
                    }))
                  }}
                  question={question}
                  value={responses[question.id]}
                />
              ))}
            </section>
          ))}
          </div>

        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
          <PrimaryButton type="submit">
            <Save size={18} />
            Save session
          </PrimaryButton>
        </div>
      </Panel>

      <Panel title="Session context">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-slate-900">Age</dt>
            <dd className="text-slate-600">{activeDraft.input.age}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Cycle regularity</dt>
            <dd className="text-slate-600">
              {activeDraft.input.cycleRegularity ?? 'Not provided'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Flagged biomarkers</dt>
            <dd className="text-slate-600">
              {activeDraft.validation.flags.length > 0
                ? activeDraft.validation.flags.join(', ')
                : 'No out-of-range biomarkers'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Question bank</dt>
            <dd className="text-slate-600">
              {questions.length} fixed questions selected from the standard bank.
            </dd>
          </div>
        </dl>
      </Panel>
    </form>
  )
}

function QuestionField({
  onChange,
  question,
  value,
}: {
  onChange: (value: string | string[]) => void
  question: QuestionDefinition
  value: string | string[] | undefined
}) {
  const fieldLabel = `${question.code}. ${question.label}${question.required ? '' : ' (optional)'}`

  return (
    <Field label={fieldLabel}>
      {question.type === 'select' ? (
        <select
          aria-label={question.label}
          className={fieldControlClass}
          onChange={(event) => onChange(event.target.value)}
          value={typeof value === 'string' ? value : ''}
        >
          <option value="">Select an answer</option>
          {question.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : question.type === 'multiselect' ? (
        <div className="grid gap-2 rounded-[12px] border border-slate-200 bg-white p-3 sm:grid-cols-2">
          {question.options?.map((option) => {
            const values = Array.isArray(value) ? value : []
            return (
              <label className="flex items-center gap-2 text-sm text-slate-700" key={option}>
                <input
                  checked={values.includes(option)}
                  className="size-4 rounded border-slate-300 text-indigo-700 focus:ring-indigo-200"
                  onChange={(event) => {
                    onChange(
                      event.target.checked
                        ? [...values, option]
                        : values.filter((entry) => entry !== option),
                    )
                  }}
                  type="checkbox"
                />
                {option}
              </label>
            )
          })}
        </div>
      ) : question.type === 'number' || question.type === 'date' ? (
        <input
          aria-label={question.label}
          className={fieldControlClass}
          onChange={(event) => onChange(event.target.value)}
          type={question.type}
          value={typeof value === 'string' ? value : ''}
        />
      ) : (
        <textarea
          aria-label={question.label}
          className={`${fieldControlClass} min-h-24`}
          onChange={(event) => onChange(event.target.value)}
          value={typeof value === 'string' ? value : ''}
        />
      )}
      {question.purpose ? <p className="mt-1 text-xs text-slate-500">{question.purpose}</p> : null}
    </Field>
  )
}
