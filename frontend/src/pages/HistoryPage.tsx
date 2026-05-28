import { Download, Eye, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, Panel, SecondaryButton, StatusBadge } from '../components/ui'
import { referenceRanges } from '../config/referenceRanges'
import { notifyRecordsChanged } from '../context/records'
import { useAuth } from '../context/auth'
import type { DailyLogRecord, LabDocumentRecord } from '../types/monitoring'
import type { LabSession, MedicationRecord, SymptomEntry } from '../types/session'

function exportJson(data: unknown) {
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `endobridge-account-export-${date}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function HistoryPage() {
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
      setSessions(
        nextSessions.sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)),
      )
      setSymptoms(nextSymptoms)
      setMedications(nextMedications)
      setDailyLogs(nextDailyLogs)
      setDocuments(nextDocuments)
    })
  }, [api, token])

  async function clearAccountMonitoringData() {
    if (!token) return
    const confirmed = window.confirm(
      'This will permanently delete your EndoBridge monitoring records from your EndoBridge account. Continue?',
    )

    if (!confirmed) return

    await api.deleteMonitoringData(token, 'all')
    setSessions([])
    setSymptoms([])
    setMedications([])
    setDailyLogs([])
    setDocuments([])
    notifyRecordsChanged()
  }

  return (
    <section className="space-y-6">
      <Panel eyebrow="Account-backed records" title="Account history">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-600">
              {sessions.length} stored {sessions.length === 1 ? 'lab session' : 'lab sessions'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {symptoms.length} symptom entries, {medications.length} medication reminders,{' '}
              {dailyLogs.length} daily logs, and {documents.length} PDF records are stored in your
              EndoBridge account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton
              onClick={() =>
                exportJson({
                  exportedAt: new Date().toISOString(),
                  sessions,
                  symptoms,
                  medications,
                  dailyLogs,
                  documents: documents.map((document) => ({
                    documentId: document.documentId,
                    fileName: document.fileName,
                    fileType: document.fileType,
                    fileSize: document.fileSize,
                    uploadedAt: document.uploadedAt,
                    extractionStatus: document.extractionStatus,
                  })),
                })
              }
            >
              <Download size={18} />
              Export account data
            </SecondaryButton>
            <SecondaryButton onClick={clearAccountMonitoringData}>
              <Trash2 size={18} />
              Delete account records
            </SecondaryButton>
          </div>
        </div>

        {sessions.length === 0 ? (
          <EmptyState title="No monitoring sessions yet">
            Start a lab session to create account-backed history and report context.
          </EmptyState>
        ) : (
          <div className="mt-5 grid gap-3">
            {sessions.map((session) => {
              const flaggedCount = Object.values(session.biomarkers).filter(
                (entry) => entry?.isFlagged,
              ).length
              const activeSymptomCount = symptoms.filter(
                (symptom) => symptom.sessionId === session.sessionId && symptom.severity !== 'none',
              ).length
              const activeMedicationCount = medications.filter(
                (medication) => medication.isActive,
              ).length

              return (
                <article
                  className="rounded-[14px] border border-slate-200 bg-slate-50 p-4"
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
                        {activeSymptomCount} active symptoms
                      </StatusBadge>
                      <StatusBadge tone={activeMedicationCount > 0 ? 'success' : 'neutral'}>
                        {activeMedicationCount} active medications
                      </StatusBadge>
                      <Link
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                        to={`/history/${session.sessionId}`}
                      >
                        <Eye size={17} />
                        View details
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Panel>

      <Panel title="Tracked biomarker panel">
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(referenceRanges).map((range) => (
            <div className="rounded-[12px] bg-slate-50 px-3 py-2" key={range.label}>
              <p className="font-medium text-slate-900">{range.label}</p>
              <p className="text-slate-600">{range.unit}</p>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  )
}
