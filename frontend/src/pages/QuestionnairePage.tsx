import { Save } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Field, Panel, PrimaryButton, SecondaryButton, fieldControlClass } from '../components/ui'
import type { QuestionDefinition } from '../config/questionBank'
import { generateQuestionnaire } from '../engines/questionnaireGenerator'
import { createLabSession } from '../models/labSession'
import { notifyRecordsChanged } from '../context/records'
import { useAuth } from '../context/auth'
import { useSessionDraft } from '../context/sessionDraft'
import type { QuestionnaireResponse } from '../types/session'

type ResponseDraft = Record<string, string | string[]>

const sectionLabels: Record<QuestionDefinition['level'], string> = {
  base: 'Base questions',
  'flag-follow-up': 'Priority follow-up questions',
  'biomarker-based': 'Biomarker-based questions',
  'daily-context': 'Optional daily context',
  'medication-adherence': 'Medication adherence',
}

const questionnairePages = [
  {
    id: 'profile',
    title: 'Profile measurements',
    description: 'Age, weight in kg, and height in cm are labeled strictly for BMI context.',
    questionIds: ['q1-age', 'q2-current-weight', 'q3-height'],
  },
  {
    id: 'cycle',
    title: 'Cycle pattern',
    description: 'Cycle timing, period pattern, and recent pelvic discomfort.',
    questionIds: [
      'q4-cycle-regularity-3-months',
      'q5-usual-cycle-length',
      'q6-last-menstrual-period',
      'q7-menstrual-flow',
      'q8-pelvic-pain',
      'q14-missed-periods',
      'q15-predictable-periods',
      'q16-spotting',
      'q17-cycle-comparison',
    ],
  },
  {
    id: 'skin-hair',
    title: 'Skin and hair symptoms',
    description: 'Acne, unwanted hair growth, hair thinning, and location notes.',
    questionIds: [
      'q9-acne',
      'q10-unwanted-hair',
      'q11-hair-thinning',
      'q12-hair-growth-location',
      'q13-skin-hair-change',
    ],
  },
  {
    id: 'metabolic',
    title: 'Metabolic and body changes',
    description: 'Weight change, fatigue, cravings, activity, and lifestyle context.',
    questionIds: [
      'q18-weight-changes',
      'q19-fatigue-frequency',
      'q20-cravings-hunger',
      'q21-physical-activity',
      'q22-food-notes',
      'q23-activity-notes',
    ],
  },
  {
    id: 'daily',
    title: 'Daily context',
    description: 'Sleep, stress, mood, and symptom notes that can be joined with daily logs.',
    questionIds: ['q24-sleep-hours', 'q25-sleep-quality', 'q26-stress-level', 'q27-mood', 'q28-other-symptoms'],
  },
  {
    id: 'adherence',
    title: 'Medication and adherence context',
    description: 'Reminder-related tracking only; medication details stay out of AI payloads.',
    questionIds: ['q29-medication-scheduled', 'q30-medication-note'],
  },
] as const

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

function questionsByPage(questions: QuestionDefinition[]) {
  return questionnairePages
    .map((page) => ({
      ...page,
      questions: page.questionIds
        .map((id) => questions.find((question) => question.id === id))
        .filter((question): question is QuestionDefinition => Boolean(question)),
    }))
    .filter((page) => page.questions.length > 0)
}

export function QuestionnairePage() {
  const navigate = useNavigate()
  const { api, token } = useAuth()
  const { draft, clearDraft } = useSessionDraft()
  const [responses, setResponses] = useState<ResponseDraft>(() => {
    if (!draft) return {} as ResponseDraft
    const defaultResponses: ResponseDraft = {
      'q1-age': String(draft.input.age),
      'q2-current-weight': draft.input.weightKg ? String(draft.input.weightKg) : '',
      'q3-height': draft.input.heightCm ? String(draft.input.heightCm) : '',
    }
    return defaultResponses
  })
  const [includeDailyContext] = useState(true)
  const [hasMedicationRecords] = useState(true)
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [error, setError] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)
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
  const pageGroups = useMemo(() => questionsByPage(questions), [questions])
  const visiblePageIndex = Math.min(activePageIndex, Math.max(pageGroups.length - 1, 0))
  const activePage = pageGroups[visiblePageIndex]
  const answeredRequiredCount = questions.filter(
    (question) => question.required && !isMissingRequired(question, responses[question.id]),
  ).length
  const requiredCount = questions.filter((question) => question.required).length
  const progressPercent = requiredCount > 0 ? Math.round((answeredRequiredCount / requiredCount) * 100) : 0

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
    const missingQuestions = questions.filter((question) => isMissingRequired(question, responses[question.id]))

    if (missingQuestions.length > 0) {
      setSubmitAttempted(true)
      const firstMissing = missingQuestions[0]
      const pageIndex = pageGroups.findIndex((page) => page.questions.some((q) => q.id === firstMissing.id))
      if (pageIndex !== -1) {
        setActivePageIndex(pageIndex)
      }
      const labels = missingQuestions.map((q) => {
        const page = pageGroups.find((p) => p.questions.some((pq) => pq.id === q.id))
        return `${q.code} in "${page ? page.title : 'General'}"`
      }).join(', ')
      setError(`Answer all required questionnaire items before saving the session. Unanswered: ${labels}`)
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
          <span className="rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
            Daily context included
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
            Page {visiblePageIndex + 1} of {pageGroups.length}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            {progressPercent}% required answers complete
          </span>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-5 space-y-7">
          {activePage ? (
            <section className="space-y-4" key={activePage.id}>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  {activePage.title}
                </h2>
                <p className="text-xs leading-5 text-slate-500">
                  {activePage.description} {activePage.questions.length}{' '}
                  {activePage.questions.length === 1 ? 'question' : 'questions'}.
                </p>
              </div>
              {activePage.questions.map((question) => (
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
                  error={
                    submitAttempted && isMissingRequired(question, responses[question.id])
                      ? 'This question is required.'
                      : undefined
                  }
                />
              ))}
            </section>
          ) : null}
          </div>

        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
          {visiblePageIndex > 0 ? (
            <SecondaryButton onClick={() => setActivePageIndex((current) => current - 1)} type="button">
              Back
            </SecondaryButton>
          ) : null}
          {visiblePageIndex < pageGroups.length - 1 ? (
            <PrimaryButton
              onClick={() => {
                const currentPage = pageGroups[visiblePageIndex]
                const missingOnPage = currentPage.questions.filter((q) => isMissingRequired(q, responses[q.id]))
                if (missingOnPage.length > 0) {
                  setSubmitAttempted(true)
                  const labels = missingOnPage.map((q) => q.code).join(', ')
                  setError(`Please answer the required question(s) on this page: ${labels}`)
                  return
                }
                setError('')
                setActivePageIndex((current) => current + 1)
              }}
              type="button"
            >
              Next section
            </PrimaryButton>
          ) : (
            <PrimaryButton type="submit">
              <Save size={18} />
              Save session
            </PrimaryButton>
          )}
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
              {questions.length} fixed questions selected across {pageGroups.length} questionnaire pages.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Section counts</dt>
            <dd className="text-slate-600">
              {Object.entries(questionGroups)
                .map(([level, groupQuestions]) => `${sectionLabels[level as QuestionDefinition['level']]}: ${groupQuestions.length}`)
                .join('; ')}
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
  error,
}: {
  onChange: (value: string | string[]) => void
  question: QuestionDefinition
  value: string | string[] | undefined
  error?: string
}) {
  const fieldLabel = `${question.code}. ${question.label}${question.required ? '' : ' (optional)'}`

  return (
    <Field label={fieldLabel} error={error}>
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
