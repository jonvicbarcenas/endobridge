import { Download, Eye, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Panel, SecondaryButton, StatusBadge } from '../components/ui'
import { referenceRanges } from '../config/referenceRanges'
import { ExportService } from '../services/exportService'
import { LocalStorageService } from '../services/localStorageService'
import type { LabSession } from '../types/session'

export function HistoryPage({ onLocalDataPurged }: { onLocalDataPurged: () => void }) {
  const navigate = useNavigate()
  const storage = useMemo(() => new LocalStorageService(), [])
  const [sessions, setSessions] = useState<LabSession[]>(() => storage.getAllSessions())
  const symptoms = storage.getAllSymptoms()
  const medications = storage.getMedications()

  function clearLocalData() {
    const confirmed = window.confirm(
      'This will permanently delete local sessions, symptoms, medications, consent, and age confirmation from this browser. Continue?',
    )

    if (!confirmed) return

    storage.clearAll()
    setSessions([])
    onLocalDataPurged()
    navigate('/', { replace: true })
  }

  return (
    <section className="space-y-6">
      <Panel title="Session history">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-600">
              {sessions.length} stored {sessions.length === 1 ? 'session' : 'sessions'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {symptoms.length} symptom entries and {medications.length} medication reminders are
              stored locally.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => new ExportService(storage).exportAll()}>
              <Download size={18} />
              Export history
            </SecondaryButton>
            <SecondaryButton onClick={clearLocalData}>
              <Trash2 size={18} />
              Clear local data
            </SecondaryButton>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
            No local monitoring sessions are stored in this browser yet.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {sessions.map((session) => {
              const flaggedCount = Object.values(session.biomarkers).filter(
                (entry) => entry?.isFlagged,
              ).length
              const activeSymptomCount = symptoms.filter(
                (symptom) => symptom.sessionId === session.sessionId && symptom.severity !== 'none',
              ).length

              return (
                <article
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  key={session.sessionId}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {new Date(session.timestamp).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Session ID {session.sessionId.slice(0, 14)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={flaggedCount > 0 ? 'warning' : 'success'}>
                        {flaggedCount} flagged
                      </StatusBadge>
                      <StatusBadge tone={activeSymptomCount > 0 ? 'warning' : 'neutral'}>
                        {activeSymptomCount}{' '}
                        {activeSymptomCount === 1 ? 'active symptom' : 'active symptoms'}
                      </StatusBadge>
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
                        to={`/history/${session.sessionId}`}
                      >
                        <Eye size={17} />
                        View details
                      </Link>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="font-medium text-slate-900">Age</dt>
                      <dd className="text-slate-600">{session.supplementary.age}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">Cycle</dt>
                      <dd className="text-slate-600">
                        {session.supplementary.cycleRegularity ?? 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">Panel</dt>
                      <dd className="text-slate-600">
                        {Object.keys(session.biomarkers).length} biomarkers
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        )}
      </Panel>

      <Panel title="Tracked biomarker panel">
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(referenceRanges).map((range) => (
            <div className="rounded-md bg-slate-50 px-3 py-2" key={range.label}>
              <p className="font-medium text-slate-900">{range.label}</p>
              <p className="text-slate-600">{range.unit}</p>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  )
}
