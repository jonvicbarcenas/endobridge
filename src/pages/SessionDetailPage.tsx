import { useState } from 'react'
import { ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { InsightReport } from '../components/InsightReport'
import { SymptomSeverityBadge } from '../components/SymptomSeverityBadge'
import { Panel, PrimaryButton, StatusBadge } from '../components/ui'
import { questionBank } from '../config/questionBank'
import { referenceRanges } from '../config/referenceRanges'
import { getSymptomLabel } from '../config/symptoms'
import { InsufficientDataError, scoreSession } from '../engines/scoringEngine'
import { LocalStorageService } from '../services/localStorageService'
import {
  InsightServiceUnavailableError,
  UnsafeInsightError,
  generateInsight,
} from '../services/proxyClient'
import type { SynthesisOutput } from '../types/insight'
import type { BiomarkerEntry, BiomarkerKey } from '../types/session'

function rangeLabel(direction?: string) {
  if (direction === 'low') return 'below expected range'
  if (direction === 'high') return 'above expected range'
  if (direction === 'normal') return 'within expected range'
  return 'not available'
}

function questionLabel(questionId: string) {
  return questionBank.find((question) => question.id === questionId)?.label ?? questionId
}

export function SessionDetailPage() {
  const { sessionId } = useParams()
  const storage = new LocalStorageService()
  const [session, setSession] = useState(() => (sessionId ? storage.getSession(sessionId) : null))
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const symptomEntries = sessionId ? storage.getSymptomsForSession(sessionId) : []
  const activeMedications = storage.getMedications().filter((medication) => medication.isActive)

  if (!session) {
    return (
      <Panel title="Session not found">
        <p className="text-sm text-slate-600">
          This local session is no longer available in this browser.
        </p>
        <Link
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
          to="/history"
        >
          <ArrowLeft size={17} />
          Back to history
        </Link>
      </Panel>
    )
  }

  const biomarkerEntries = Object.entries(session.biomarkers).filter(
    (entry): entry is [BiomarkerKey, BiomarkerEntry] => Boolean(entry[1]),
  )

  let synthesis: SynthesisOutput | null = null
  let contributorError: 'insufficient' | 'unknown' | null = null

  try {
    synthesis = scoreSession(session, {
      sessions: storage.getAllSessions(),
      symptoms: storage.getAllSymptoms(),
    })
  } catch (error) {
    contributorError = error instanceof InsufficientDataError ? 'insufficient' : 'unknown'
  }

  async function handleGenerateInsight() {
    if (!session || !synthesis || isGeneratingReport) return

    setIsGeneratingReport(true)
    setReportError(null)

    try {
      const insightReport = await generateInsight(synthesis)
      const updatedSession = { ...session, insightReport }
      storage.saveSession(updatedSession)
      setSession(updatedSession)
    } catch (error) {
      if (error instanceof UnsafeInsightError) {
        setReportError(
          'The generated report was blocked because it did not stay within EndoBridge safety limits. Please retry later.',
        )
      } else if (error instanceof InsightServiceUnavailableError) {
        setReportError('Insight generation is temporarily unavailable. Please retry later.')
      } else {
        setReportError('Insight report could not be generated safely. Please retry later.')
      }
    } finally {
      setIsGeneratingReport(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          to="/history"
        >
          <ArrowLeft size={17} />
          Back to history
        </Link>
      </div>

      <Panel title="Session detail">
        <dl className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="font-medium text-slate-900">Saved</dt>
            <dd className="text-slate-600">{new Date(session.timestamp).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Age</dt>
            <dd className="text-slate-600">{session.supplementary.age}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">BMI</dt>
            <dd className="text-slate-600">{session.supplementary.bmi ?? 'Not provided'}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Cycle</dt>
            <dd className="text-slate-600">
              {session.supplementary.cycleRegularity ?? 'Not provided'}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Biomarker panel">
        <div className="grid gap-3 md:grid-cols-2">
          {biomarkerEntries.map(([key, entry]) => (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={key}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{referenceRanges[key].label}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {entry.value} {entry.unit}
                  </p>
                </div>
                <StatusBadge tone={entry.isFlagged ? 'warning' : 'success'}>
                  {rangeLabel(entry.direction)}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Questionnaire answers">
        {session.questionnaire && Object.keys(session.questionnaire).length > 0 ? (
          <dl className="space-y-3 text-sm">
            {Object.entries(session.questionnaire).map(([questionId, answer]) => (
              <div className="rounded-md bg-slate-50 p-3" key={questionId}>
                <dt className="font-medium text-slate-900">{questionLabel(questionId)}</dt>
                <dd className="mt-1 text-slate-600">
                  <code className="mr-2 rounded bg-white px-1 py-0.5 text-xs text-slate-500">
                    {questionId}
                  </code>
                  {String(answer ?? 'No answer')}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-slate-600">No questionnaire answers were saved.</p>
        )}
      </Panel>

      <Panel title="Session symptoms">
        {symptomEntries.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {symptomEntries.map((symptom) => (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={symptom.entryId}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    {getSymptomLabel(symptom.symptomKey)}
                  </p>
                  <SymptomSeverityBadge severity={symptom.severity} />
                </div>
                {symptom.note ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">{symptom.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No symptom entries are linked to this session.</p>
        )}
      </Panel>

      <Panel title="Medication reminder context">
        <p className="text-sm font-medium text-slate-900">
          {activeMedications.length}{' '}
          {activeMedications.length === 1 ? 'active local reminder' : 'active local reminders'}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Medication names, dosage labels, and schedules remain stored only in this browser and are
          not part of the Gemini payload boundary.
        </p>
      </Panel>

      <Panel title="Deterministic contributors">
        {contributorError === 'insufficient' ? (
          <div className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 shrink-0" size={17} />
            Contributor ranking is unavailable because this session is missing required
            biomarker data.
          </div>
        ) : contributorError === 'unknown' ? (
          <p className="text-sm text-rose-700">Contributor ranking could not be generated.</p>
        ) : synthesis && synthesis.topContributors.length > 0 ? (
          <ol className="space-y-3">
            {synthesis.topContributors.map((contributor) => (
              <li className="rounded-md bg-slate-50 p-3" key={contributor.key}>
                <p className="text-sm font-semibold text-slate-950">
                  Rank {contributor.rank}: {referenceRanges[contributor.key].label}
                </p>
                <p className="mt-1 text-sm text-slate-600">Weight {contributor.weight}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-600">No out-of-range contributors for this session.</p>
        )}
      </Panel>

      <Panel title="Gemini insight report">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            Generates a bounded observational report through the serverless proxy. Medication
            reminder names, dosage labels, and schedules remain local and are not sent.
          </p>

          <PrimaryButton
            disabled={isGeneratingReport || contributorError !== null}
            onClick={handleGenerateInsight}
          >
            <Sparkles size={17} />
            {isGeneratingReport
              ? 'Generating insight report...'
              : session.insightReport
                ? 'Regenerate insight report'
                : 'Generate insight report'}
          </PrimaryButton>

          {reportError ? (
            <div className="flex gap-2 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 shrink-0" size={17} />
              {reportError}
            </div>
          ) : null}

          {session.insightReport ? (
            <InsightReport report={session.insightReport} session={session} />
          ) : (
            <p className="text-sm text-slate-600">No AI insight report is stored for this session.</p>
          )}
        </div>
      </Panel>
    </section>
  )
}
