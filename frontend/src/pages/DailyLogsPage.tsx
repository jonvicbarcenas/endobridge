import { CalendarDays, Save, Trash2, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { EmptyState, Field, Panel, PrimaryButton, SecondaryButton, fieldControlClass } from '../components/ui'
import { notifyRecordsChanged } from '../context/records'
import { useAuth } from '../context/auth'
import type { DailyLogRecord } from '../types/monitoring'

const emptyForm = {
  foodNotes: '',
  exercise: '',
  sleepHours: '',
  mood: '',
  stressLevel: '',
  cycleEvent: '',
  weightKg: '',
  medicationAdherence: '',
  symptomsNote: '',
}

function createId() {
  return globalThis.crypto?.randomUUID
    ? `daily-${globalThis.crypto.randomUUID()}`
    : `daily-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function DailyLogsPage() {
  const { api, token } = useAuth()
  const [logs, setLogs] = useState<DailyLogRecord[]>([])
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [editingLog, setEditingLog] = useState<DailyLogRecord | null>(null)

  useEffect(() => {
    if (!token) return
    api
      .listRecordData<DailyLogRecord>(token, 'daily-logs')
      .then((records) =>
        setLogs(records.sort((left, right) => Date.parse(right.date) - Date.parse(left.date))),
      )
  }, [api, token])

  const todayStr = getLocalDateString(new Date())
  const hasLogForToday = logs.some((log) => getLocalDateString(new Date(log.date)) === todayStr)

  async function saveDailyLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    if (editingLog) {
      const record: DailyLogRecord = {
        ...editingLog,
        foodNotes: form.foodNotes.trim(),
        exercise: form.exercise.trim(),
        sleepHours: form.sleepHours ? Number(form.sleepHours) : null,
        mood: form.mood.trim(),
        stressLevel: form.stressLevel ? Number(form.stressLevel) : null,
        cycleEvent: form.cycleEvent.trim(),
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        medicationAdherence: form.medicationAdherence.trim(),
        symptomsNote: form.symptomsNote.trim(),
      }

      try {
        await api.updateRecord<DailyLogRecord>(token, 'daily-logs', editingLog.logId, record)
        setLogs((current) =>
          current.map((item) => (item.logId === editingLog.logId ? record : item)),
        )
        setForm(emptyForm)
        setEditingLog(null)
        setMessage('Daily wellness log updated successfully.')
        notifyRecordsChanged()
      } catch (err) {
        console.error(err)
        setMessage('Failed to update the daily log.')
      }
      return
    }

    if (hasLogForToday) {
      setMessage('You have already submitted a log for today. You can select it from the list to update it.')
      return
    }

    const record: DailyLogRecord = {
      logId: createId(),
      date: new Date().toISOString(),
      foodNotes: form.foodNotes.trim(),
      exercise: form.exercise.trim(),
      sleepHours: form.sleepHours ? Number(form.sleepHours) : null,
      mood: form.mood.trim(),
      stressLevel: form.stressLevel ? Number(form.stressLevel) : null,
      cycleEvent: form.cycleEvent.trim(),
      weightKg: form.weightKg ? Number(form.weightKg) : null,
      medicationAdherence: form.medicationAdherence.trim(),
      symptomsNote: form.symptomsNote.trim(),
      createdAt: new Date().toISOString(),
    }

    try {
      await api.createRecord<DailyLogRecord>(token, 'daily-logs', record)
      setLogs((current) => [record, ...current])
      setForm(emptyForm)
      setMessage('Daily wellness log saved to your account.')
      notifyRecordsChanged()
    } catch (err) {
      console.error(err)
      setMessage('Failed to save the daily log.')
    }
  }

  async function deleteDailyLog(logId: string) {
    if (!token) return
    const confirmed = window.confirm('Are you sure you want to delete this wellness log?')
    if (!confirmed) return

    try {
      await api.deleteRecord(token, 'daily-logs', logId)
      setLogs((current) => current.filter((item) => item.logId !== logId))
      if (editingLog?.logId === logId) {
        setForm(emptyForm)
        setEditingLog(null)
      }
      setMessage('Daily wellness log deleted successfully.')
      notifyRecordsChanged()
    } catch (err) {
      console.error(err)
      setMessage('Failed to delete the daily log.')
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Panel eyebrow="Module 4" title={editingLog ? 'Edit wellness log' : 'Daily wellness log'}>
        <p className="text-sm leading-6 text-slate-600">
          Track personal notes that can help you review weekly or monthly patterns. EndoBridge
          summarizes observations only; it does not recommend treatment changes.
        </p>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveDailyLog}>
          <Field label="Food notes">
            <textarea
              className={`${fieldControlClass} min-h-24`}
              onChange={(event) => setForm((current) => ({ ...current, foodNotes: event.target.value }))}
              value={form.foodNotes}
            />
          </Field>
          <Field label="Exercise">
            <textarea
              className={`${fieldControlClass} min-h-24`}
              onChange={(event) => setForm((current) => ({ ...current, exercise: event.target.value }))}
              value={form.exercise}
            />
          </Field>
          <Field label="Sleep hours">
            <input
              className={fieldControlClass}
              min={0}
              onChange={(event) => setForm((current) => ({ ...current, sleepHours: event.target.value }))}
              step="0.5"
              type="number"
              value={form.sleepHours}
            />
          </Field>
          <Field label="Mood">
            <input
              className={fieldControlClass}
              onChange={(event) => setForm((current) => ({ ...current, mood: event.target.value }))}
              value={form.mood}
            />
          </Field>
          <Field label="Stress level (1-10)">
            <input
              className={fieldControlClass}
              max={10}
              min={1}
              onChange={(event) => setForm((current) => ({ ...current, stressLevel: event.target.value }))}
              type="number"
              value={form.stressLevel}
            />
          </Field>
          <Field label="Cycle event">
            <input
              className={fieldControlClass}
              onChange={(event) => setForm((current) => ({ ...current, cycleEvent: event.target.value }))}
              value={form.cycleEvent}
            />
          </Field>
          <Field label="Weight change / weight kg">
            <input
              className={fieldControlClass}
              onChange={(event) => setForm((current) => ({ ...current, weightKg: event.target.value }))}
              step="0.1"
              type="number"
              value={form.weightKg}
            />
          </Field>
          <Field label="Medication adherence">
            <input
              className={fieldControlClass}
              onChange={(event) =>
                setForm((current) => ({ ...current, medicationAdherence: event.target.value }))
              }
              value={form.medicationAdherence}
            />
          </Field>
          <Field label="Symptoms note">
            <textarea
              className={`${fieldControlClass} min-h-24`}
              onChange={(event) => setForm((current) => ({ ...current, symptomsNote: event.target.value }))}
              value={form.symptomsNote}
            />
          </Field>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            {message ? <p className="w-full mb-1 text-sm font-medium text-emerald-700">{message}</p> : null}
            {editingLog ? (
              <>
                <PrimaryButton type="submit">
                  <Save size={18} />
                  Update daily log
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => deleteDailyLog(editingLog.logId)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200"
                >
                  <Trash2 size={18} />
                  Delete log
                </button>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setEditingLog(null)
                    setForm(emptyForm)
                    setMessage('')
                  }}
                >
                  <X size={18} />
                  Cancel
                </SecondaryButton>
              </>
            ) : (
              <>
                <PrimaryButton type="submit" disabled={hasLogForToday}>
                  <Save size={18} />
                  Save daily log
                </PrimaryButton>
                {hasLogForToday && (
                  <p className="text-sm font-medium text-amber-600">
                    You have already logged your wellness for today. You can select it from the recent logs to update it.
                  </p>
                )}
              </>
            )}
          </div>
        </form>
      </Panel>

      <Panel title="Recent logs">
        {logs.length === 0 ? (
          <EmptyState title="No daily wellness logs yet">
            Daily logs are optional and do not block lab sessions, reports, reminders, or dashboard
            access.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 8).map((log) => {
              const isEditing = editingLog?.logId === log.logId
              const isToday = getLocalDateString(new Date(log.date)) === todayStr

              return (
                <article
                  className={`group relative rounded-[12px] border p-3 transition cursor-pointer ${
                    isEditing
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  key={log.logId}
                  onClick={() => {
                    setEditingLog(log)
                    setForm({
                      foodNotes: log.foodNotes,
                      exercise: log.exercise,
                      sleepHours: log.sleepHours !== null ? String(log.sleepHours) : '',
                      mood: log.mood,
                      stressLevel: log.stressLevel !== null ? String(log.stressLevel) : '',
                      cycleEvent: log.cycleEvent,
                      weightKg: log.weightKg !== null ? String(log.weightKg) : '',
                      medicationAdherence: log.medicationAdherence,
                      symptomsNote: log.symptomsNote,
                    })
                    setMessage('')
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                      <CalendarDays size={16} className="text-slate-500" />
                      {new Date(log.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isToday && (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                          Today
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                      title="Delete log"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteDailyLog(log.logId)
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                    {log.mood || log.symptomsNote || log.cycleEvent || 'Saved wellness entry'}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </Panel>
    </section>
  )
}
