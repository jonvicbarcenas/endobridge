import { Bell, Check, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { calculateNextReminderAt, formatDosage, isMedicationDue } from '../config/medications'
import { useAuth } from '../context/auth'
import { notifyRecordsChanged, recordsChangedEvent } from '../context/records'
import { NotificationService } from '../services/notificationService'
import type { MedicationRecord } from '../types/session'

const CHECK_INTERVAL_MS = 30_000

/**
 * App-wide reminder checker. It runs on every page (not only Medication
 * Reminders), so alerts fire wherever the user is in the app. It shows a
 * system notification when allowed, and always shows an in-app banner.
 */
export function ReminderWatcher() {
  const { api, token } = useAuth()
  const notifications = useMemo(() => new NotificationService(), [])
  const [medications, setMedications] = useState<MedicationRecord[]>([])
  const [dueNow, setDueNow] = useState<MedicationRecord[]>([])
  const alerted = useRef(new Set<string>())

  const load = useCallback(() => {
    if (!token) return
    Promise.resolve()
      .then(() => api.listRecordData<MedicationRecord>(token, 'medications'))
      .then(setMedications)
      .catch(() => undefined)
  }, [api, token])

  useEffect(() => {
    load()
    window.addEventListener(recordsChangedEvent, load)
    return () => window.removeEventListener(recordsChangedEvent, load)
  }, [load])

  useEffect(() => {
    function check() {
      const due = medications.filter((medication) => isMedicationDue(medication))
      setDueNow(due)
      due.forEach((medication) => {
        const key = `${medication.medId}:${medication.nextReminderAt}`
        if (alerted.current.has(key)) return
        alerted.current.add(key)
        void notifications.sendReminder(medication)
      })
    }
    check()
    const timer = window.setInterval(check, CHECK_INTERVAL_MS)
    // Phones pause timers in background tabs; check again when the tab returns.
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [medications, notifications])

  async function settle(medication: MedicationRecord, taken: boolean) {
    if (!token) return
    const updated: MedicationRecord = {
      ...medication,
      lastTakenAt: taken ? new Date().toISOString() : medication.lastTakenAt ?? null,
      nextReminderAt: calculateNextReminderAt({
        scheduleTime: medication.scheduleTime,
        frequency: medication.frequency,
      }),
    }
    setDueNow((current) => current.filter((entry) => entry.medId !== medication.medId))
    try {
      await api.updateRecord<MedicationRecord>(token, 'medications', medication.medId, updated)
      notifyRecordsChanged()
    } catch {
      // The banner returns on the next check if the update did not save.
    }
  }

  if (dueNow.length === 0) return null

  return (
    <div
      aria-live="assertive"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md space-y-2 sm:inset-x-auto sm:right-4 sm:bottom-4"
      role="region"
      aria-label="Medication reminders due"
    >
      {dueNow.map((medication) => (
        <div
          className="rounded-[14px] border border-amber-300 bg-white p-4 shadow-xl shadow-slate-400/30"
          key={medication.medId}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <Bell size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950">Reminder: {medication.name}</p>
              <p className="text-sm text-slate-600">
                {formatDosage(medication)} at {medication.scheduleTime}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-[10px] bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => settle(medication, true)}
              type="button"
            >
              <Check size={16} />
              Mark taken
            </button>
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-[10px] border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => settle(medication, false)}
              type="button"
            >
              <X size={16} />
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
