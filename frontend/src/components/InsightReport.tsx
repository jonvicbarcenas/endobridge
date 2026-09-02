import { AlertTriangle, Mail, Printer, Share2, X } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { referenceRanges } from '../config/referenceRanges'
import type { InsightReport as InsightReportData } from '../types/insight'
import type { LabSession } from '../types/session'
import { buildMailtoUrl, buildReportEmail } from './reportEmail'

const DISCLAIMER_TEXT =
  'This output does not constitute a clinical diagnosis or medical advice. It is an observational summary of patterns in your submitted data and is intended for informational tracking only. EndoBridge is not a substitute for professional medical care.'

const DISTRESS_NOTE =
  'For immediate emotional distress support in the Philippines, contact the DOH-NCMH Crisis Hotline at 1553, 1800-1888-1553, 0919-057-1553, 0966-351-4518, or 0917-899-8727.'

function directionLabel(direction: string) {
  return direction === 'low' ? 'Below reference' : 'Elevated'
}

function contributorSeverity(weight: number) {
  if (weight >= 0.45) {
    return {
      label: 'High contribution',
      color: 'bg-rose-600',
      text: 'text-rose-700',
      track: 'bg-rose-100',
    }
  }

  if (weight >= 0.25) {
    return {
      label: 'Moderate contribution',
      color: 'bg-amber-500',
      text: 'text-amber-700',
      track: 'bg-amber-100',
    }
  }

  return {
    label: 'Lower contribution',
    color: 'bg-emerald-600',
    text: 'text-emerald-700',
    track: 'bg-emerald-100',
  }
}

export function InsightReport({
  report,
  session,
}: {
  report: InsightReportData
  session: LabSession
}) {
  const initialEmail = buildReportEmail(report, session)
  const [isShareOpen, setShareOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState(initialEmail.subject)
  const [message, setMessage] = useState(initialEmail.body)
  const shareButtonRef = useRef<HTMLButtonElement>(null)
  const recipientInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isShareOpen) return

    const previousOverflow = document.body.style.overflow
    const shareButton = shareButtonRef.current
    document.body.style.overflow = 'hidden'
    recipientInputRef.current?.focus()

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setShareOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
      shareButton?.focus()
    }
  }, [isShareOpen])

  function openShareDialog() {
    const email = buildReportEmail(report, session)
    setRecipient('')
    setSubject(email.subject)
    setMessage(email.body)
    setShareOpen(true)
  }

  function openEmailApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const mailtoUrl = buildMailtoUrl(recipient, subject, message)
    setShareOpen(false)
    window.location.href = mailtoUrl
  }

  return (
    <section className="space-y-4 rounded-md border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Insight report</h2>
          <p className="mt-1 text-sm text-slate-600">
            Generated {new Date(report.reportTimestamp).toLocaleString()} for session{' '}
            {session.sessionId.slice(0, 8)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={16} />
            Print report
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={openShareDialog}
            ref={shareButtonRef}
            type="button"
          >
            <Share2 size={16} />
            Share report
          </button>
        </div>
      </div>

      <div className="rounded-md bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">Observational summary</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
          {report.observationalSummary}
        </p>
      </div>

      <div className="rounded-md bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">Key observations</h3>
        {report.observations.length > 0 ? (
          <ul className="mt-2 space-y-3 text-sm leading-6 text-slate-700">
            {report.observations.map((observation, index) => (
              <li className="rounded-md border border-slate-200 bg-slate-50 p-3" key={observation}>
                <p>{observation}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">
                  Possible reason
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {report.observationReasons?.[index] ??
                    'This may reflect the submitted lab values, questionnaire answers, and recent tracking notes together.'}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No additional observations were returned.</p>
        )}
      </div>

      <div className="rounded-md bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">Top contributing biomarkers</h3>
        {report.contributors.length > 0 ? (
          <ol className="mt-3 space-y-3">
            {report.contributors.map((contributor) => (
              <li className="rounded-md border border-slate-200 p-3" key={contributor.key}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Rank {contributor.rank}: {contributor.biomarkerLabel}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {contributor.value} {contributor.unit} | {directionLabel(contributor.direction)}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${contributorSeverity(contributor.weight).text}`}>
                    {Math.round(contributor.weight * 100)}% of max |{' '}
                    {contributorSeverity(contributor.weight).label}
                  </p>
                </div>
                <div
                  aria-label={`${contributor.biomarkerLabel} contribution ${Math.round(contributor.weight * 100)} percent`}
                  className={`mt-3 h-3 rounded-full ${contributorSeverity(contributor.weight).track}`}
                >
                  <div
                    className={`h-3 rounded-full ${contributorSeverity(contributor.weight).color}`}
                    style={{ width: `${Math.min(contributor.weight * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500">
                  <span>0%</span>
                  <span>Max 100%</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Reference unit: {referenceRanges[contributor.key].unit}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            No out-of-range contributors were included with this report.
          </p>
        )}
      </div>

      <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        <AlertTriangle className="mt-0.5 shrink-0" size={17} />
        <p>{DISCLAIMER_TEXT}</p>
      </div>

      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
        {DISTRESS_NOTE}
      </p>

      {isShareOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShareOpen(false)
          }}
        >
          <section
            aria-labelledby="share-report-title"
            aria-modal="true"
            className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[16px] bg-white p-5 shadow-2xl sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950" id="share-report-title">
                  Email this report
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Choose a recipient and review the generated summary and ASCII graph before opening
                  it in your email app.
                </p>
              </div>
              <button
                aria-label="Close email report dialog"
                className="flex size-10 shrink-0 items-center justify-center rounded-[10px] text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                onClick={() => setShareOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={openEmailApp}>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Recipient email</span>
                <input
                  autoComplete="email"
                  className="min-h-11 w-full rounded-[10px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  maxLength={254}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="doctor@example.com"
                  ref={recipientInputRef}
                  required
                  type="email"
                  value={recipient}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Subject</span>
                <input
                  className="min-h-11 w-full rounded-[10px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  maxLength={200}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                  type="text"
                  value={subject}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Email message</span>
                <textarea
                  className="min-h-[320px] w-full rounded-[10px] border border-slate-300 px-3 py-2 font-mono text-xs leading-5 text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  spellCheck="true"
                  value={message}
                />
              </label>

              <p className="rounded-[10px] bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                EndoBridge will open this draft in your default email app. Review the recipient and
                contents there before pressing Send.
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setShareOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
                  type="submit"
                >
                  <Mail size={17} />
                  Open email app
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}
