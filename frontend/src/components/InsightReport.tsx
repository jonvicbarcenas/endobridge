import { AlertTriangle, Printer, Share2 } from 'lucide-react'
import { referenceRanges } from '../config/referenceRanges'
import type { InsightReport as InsightReportData } from '../types/insight'
import type { LabSession } from '../types/session'

const DISCLAIMER_TEXT =
  'This output does not constitute a clinical diagnosis or medical advice. It is an observational summary of patterns in your submitted data and is intended for informational tracking only. EndoBridge is not a substitute for professional medical care.'

const DISTRESS_NOTE =
  'For immediate emotional distress support in the Philippines, contact the DOH-NCMH Crisis Hotline at 1553, 1800-1888-1553, 0919-057-1553, 0966-351-4518, or 0917-899-8727.'

function directionLabel(direction: string) {
  return direction === 'low' ? 'Below reference' : 'Elevated'
}

function shareText(report: InsightReportData) {
  const observations = report.observations.map((observation) => `- ${observation}`).join('\n')
  return `${report.observationalSummary}\n\n${observations}\n\n${DISCLAIMER_TEXT}`
}

export function InsightReport({
  report,
  session,
}: {
  report: InsightReportData
  session: LabSession
}) {
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EndoBridge insight report',
          text: shareText(report),
        })
        return
      } catch {
        return
      }
    }

    window.print()
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
            onClick={handleShare}
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
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {report.observations.map((observation) => (
              <li key={observation}>{observation}</li>
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
                  <p className="text-sm text-slate-600">
                    Reference unit: {referenceRanges[contributor.key].unit}
                  </p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-700"
                    style={{ width: `${Math.min(contributor.weight * 100, 100)}%` }}
                  />
                </div>
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
    </section>
  )
}
