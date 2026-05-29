import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  FileText,
  FlaskConical,
  ListChecks,
  Pill,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, Panel, StatCard } from '../components/ui'
import { useAuth } from '../context/auth'
import type { DailyLogRecord, LabDocumentRecord } from '../types/monitoring'
import type { LabSession, MedicationRecord, SymptomEntry } from '../types/session'

export function DashboardPage() {
  const { api, token } = useAuth()
  const [sessions, setSessions] = useState<LabSession[]>([])
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([])
  const [medications, setMedications] = useState<MedicationRecord[]>([])
  const [dailyLogs, setDailyLogs] = useState<DailyLogRecord[]>([])
  const [documents, setDocuments] = useState<LabDocumentRecord[]>([])

  useEffect(() => {
    if (!token) return

    Promise.all([
      api.listRecordData<LabSession>(token, 'lab-sessions'),
      api.listRecordData<SymptomEntry>(token, 'symptoms'),
      api.listRecordData<MedicationRecord>(token, 'medications'),
      api.listRecordData<DailyLogRecord>(token, 'daily-logs'),
      api.listRecordData<LabDocumentRecord>(token, 'lab-documents'),
    ]).then(([nextSessions, nextSymptoms, nextMedications, nextDailyLogs, nextDocuments]) => {
      setSessions(nextSessions)
      setSymptoms(nextSymptoms)
      setMedications(nextMedications)
      setDailyLogs(nextDailyLogs)
      setDocuments(nextDocuments)
    })
  }, [api, token])

  const activeMedications = medications.filter((medication) => medication.isActive)
  const latestSession = [...sessions].sort(
    (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp),
  )[0]

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          detail="Completed lab entries"
          icon={<FlaskConical size={18} />}
          label="Lab Sessions"
          value={sessions.length.toString()}
        />
        <StatCard
          detail="Session-linked entries"
          icon={<ListChecks size={18} />}
          label="Symptoms"
          tone="cyan"
          value={symptoms.length.toString()}
        />
        <StatCard
          detail="User-entered schedules"
          icon={<Pill size={18} />}
          label="Active Reminders"
          tone="emerald"
          value={activeMedications.length.toString()}
        />
        <StatCard
          detail="Wellness records"
          icon={<CalendarDays size={18} />}
          label="Daily Logs"
          tone="amber"
          value={dailyLogs.length.toString()}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel eyebrow="SRS/SDD modules" title="Continue monitoring">
          <div className="grid gap-3 md:grid-cols-2">
            <ActionCard
              description="Manually enter LDL-C, fasting glucose, fasting insulin, testosterone, AMH, LH/FSH ratio, and DHEAS."
              href="/lab"
              icon={<FlaskConical size={20} />}
              title="Start lab session"
            />
            <ActionCard
              description="Add food, exercise, sleep, mood, stress, cycle events, symptoms, weight, and adherence notes."
              href="/daily"
              icon={<CalendarDays size={20} />}
              title="Log daily wellness"
            />
            <ActionCard
              description="Update cycle irregularity, acne, hirsutism, fatigue, and weight-change tracking by session."
              href="/symptoms"
              icon={<ListChecks size={20} />}
              title="Track symptoms"
            />
            <ActionCard
              description="Set reminders for medications already prescribed by a clinician."
              href="/medications"
              icon={<Pill size={20} />}
              title="Manage reminders"
            />
          </div>
        </Panel>

        <Panel eyebrow="Safety boundary" title="What EndoBridge will not do">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p className="flex gap-2">
              <ShieldCheck className="mt-0.5 shrink-0 text-indigo-700" size={17} />
              Reports are plain-language observations from submitted data only.
            </p>
            <p>It does not diagnose PCOS, prescribe medication, validate prescriptions, or give treatment, diet, or exercise advice.</p>
            <p>Uploaded PDF, image, and document lab results can be scanned for supported biomarker values before review.</p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Latest lab session">
          {latestSession ? (
            <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">
                {new Date(latestSession.timestamp).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {Object.values(latestSession.biomarkers).filter((entry) => entry?.isFlagged).length}{' '}
                flagged biomarkers for monitoring context.
              </p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                to={`/history/${latestSession.sessionId}`}
              >
                View session
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <EmptyState title="No lab sessions yet">
              Start with the required biomarker panel before generating questionnaire context.
            </EmptyState>
          )}
        </Panel>

        <Panel title="Account record summary">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryItem icon={<FileText size={18} />} label="Lab result files" value={documents.length} />
            <SummaryItem icon={<BarChart3 size={18} />} label="Reports" value={sessions.filter((session) => session.insightReport).length} />
            <SummaryItem icon={<CalendarDays size={18} />} label="Daily logs" value={dailyLogs.length} />
            <SummaryItem icon={<Pill size={18} />} label="All reminders" value={medications.length} />
          </div>
        </Panel>
      </div>
    </section>
  )
}

function ActionCard({
  description,
  href,
  icon,
  title,
}: {
  description: string
  href: string
  icon: ReactNode
  title: string
}) {
  return (
    <Link
      className="group rounded-[14px] border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/60"
      to={href}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white text-indigo-700 shadow-sm">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </Link>
  )
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}
