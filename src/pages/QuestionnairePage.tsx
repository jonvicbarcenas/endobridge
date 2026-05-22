import { Save } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Field, Panel, PrimaryButton } from '../components/ui'
import { generateQuestionnaire } from '../engines/questionnaireGenerator'
import { createLabSession } from '../models/labSession'
import { LocalStorageService } from '../services/localStorageService'
import { useSessionDraft } from '../context/sessionDraft'
import type { QuestionnaireResponse } from '../types/session'

export function QuestionnairePage() {
  const navigate = useNavigate()
  const storage = useMemo(() => new LocalStorageService(), [])
  const { draft, clearDraft } = useSessionDraft()
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null)

  const questions = useMemo(() => {
    if (!draft) return []

    return generateQuestionnaire(
      Object.values(draft.validation.validatedBiomarkers)
        .filter((entry) => entry?.isFlagged)
        .map((entry) => ({
          key: entry.key,
          direction: entry.direction,
        })),
    )
  }, [draft])

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

        if (question.type === 'number') {
          return [question.id, value ? Number(value) : null]
        }

        return [question.id, value?.trim() || null]
      }),
    )
  }

  function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const missing = questions.some((question) => !responses[question.id]?.trim())

    if (missing) {
      setError('Answer all questionnaire items before saving the session.')
      return
    }

    const session = createLabSession(activeDraft.input, activeDraft.validation, normalizedResponses())
    storage.saveSession(session)
    setCompletedSessionId(session.sessionId)
    clearDraft()
    navigate(`/history/${session.sessionId}`)
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]" onSubmit={saveSession}>
      <Panel title="Contextual questionnaire">
        <p className="text-sm leading-6 text-slate-600">
          These questions are generated from deterministic biomarker flags. The AI layer does not
          create questionnaire items at runtime.
        </p>

        {questions.length === 0 ? (
          <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
            No contextual questions were generated for this session. Save the session to continue.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {questions.map((question) => (
              <Field key={question.id} label={question.label}>
                {question.type === 'select' ? (
                  <select
                    aria-label={question.label}
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    onChange={(event) => {
                      setError('')
                      setResponses((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }}
                    value={responses[question.id] ?? ''}
                  >
                    <option value="">Select an answer</option>
                    {question.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : question.type === 'number' ? (
                  <input
                    aria-label={question.label}
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    onChange={(event) => {
                      setError('')
                      setResponses((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }}
                    type="number"
                    value={responses[question.id] ?? ''}
                  />
                ) : (
                  <textarea
                    aria-label={question.label}
                    className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
                    onChange={(event) => {
                      setError('')
                      setResponses((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }}
                    value={responses[question.id] ?? ''}
                  />
                )}
              </Field>
            ))}
          </div>
        )}

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
        </dl>
      </Panel>
    </form>
  )
}
