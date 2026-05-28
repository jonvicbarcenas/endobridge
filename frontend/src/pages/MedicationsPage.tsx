import { Bell, Check, Edit3, Pill, Save, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { calculateNextReminderAt, isMedicationDue, medicationFrequencyOptions } from '../config/medications'
import { notifyRecordsChanged } from '../context/records'
import { useAuth } from '../context/auth'
import { NotificationService } from '../services/notificationService'
import type { MedicationFrequency, MedicationRecord } from '../types/session'
import {
  EmptyState,
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatCard,
  StatusBadge,
  fieldControlClass,
} from '../components/ui'

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return `med-${globalThis.crypto.randomUUID()}`
  }

  return `med-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatReminder(timestamp: string | null) {
  if (!timestamp) return 'As needed'
  return new Date(timestamp).toLocaleString()
}

const emptyForm = {
  name: '',
  dosage: '',
  scheduleTime: '08:00',
  frequency: 'daily' as MedicationFrequency,
}

export function MedicationsPage() {
  const { api, token } = useAuth()
  const notificationService = useMemo(() => new NotificationService(), [])
  const [medications, setMedications] = useState<MedicationRecord[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [notificationMode, setNotificationMode] = useState<'push' | 'in-app' | null>(null)

  const activeCount = medications.filter((medication) => medication.isActive).length

  useEffect(() => {
    if (!token) return
    api.listRecordData<MedicationRecord>(token, 'medications').then(setMedications)
  }, [api, token])

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  async function enableBrowserAlerts() {
    const mode = await notificationService.init()
    setNotificationMode(mode)
    medications.forEach((medication) => notificationService.scheduleReminder(medication))
    setMessage(
      mode === 'push'
        ? 'Browser alerts are enabled for supported reminders.'
        : 'Using in-app reminders because browser alerts are unavailable.',
    )
  }

  async function saveReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const name = form.name.trim()
    const dosage = form.dosage.trim()

    if (!name || !dosage || !form.scheduleTime) {
      setMessage('Medication name, dosage, and schedule time are required.')
      return
    }

    const existing = editingId
      ? medications.find((medication) => medication.medId === editingId)
      : null
    const medication: MedicationRecord = {
      medId: existing?.medId ?? createId(),
      name,
      dosage,
      scheduleTime: form.scheduleTime,
      frequency: form.frequency,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      nextReminderAt: calculateNextReminderAt({
        scheduleTime: form.scheduleTime,
        frequency: form.frequency,
      }),
      isActive: existing?.isActive ?? true,
      lastTakenAt: existing?.lastTakenAt ?? null,
    }

    await api.createRecord<MedicationRecord>(token, 'medications', medication)
    notificationService.scheduleReminder(medication)
    setMedications((current) => [
      medication,
      ...current.filter((entry) => entry.medId !== medication.medId),
    ])
    resetForm()
    setMessage('Medication reminder saved to your account.')
    notifyRecordsChanged()
  }

  function editReminder(medication: MedicationRecord) {
    setEditingId(medication.medId)
    setForm({
      name: medication.name,
      dosage: medication.dosage,
      scheduleTime: medication.scheduleTime,
      frequency: medication.frequency,
    })
    setMessage('')
  }

  async function toggleReminder(medication: MedicationRecord) {
    if (!token) return
    const isActive = !medication.isActive
    const updated = {
      ...medication,
      isActive,
      nextReminderAt: isActive
        ? calculateNextReminderAt({
            scheduleTime: medication.scheduleTime,
            frequency: medication.frequency,
          })
        : null,
    }
    await api.updateRecord<MedicationRecord>(token, 'medications', medication.medId, updated)
    setMedications((current) =>
      current.map((entry) => (entry.medId === medication.medId ? updated : entry)),
    )
    setMessage(isActive ? 'Reminder resumed.' : 'Reminder paused.')
    notifyRecordsChanged()
  }

  async function markTaken(medication: MedicationRecord) {
    if (!token) return
    const updated = {
      ...medication,
      lastTakenAt: new Date().toISOString(),
      nextReminderAt: calculateNextReminderAt({
        scheduleTime: medication.scheduleTime,
        frequency: medication.frequency,
      }),
    }
    await api.updateRecord<MedicationRecord>(token, 'medications', medication.medId, updated)
    setMedications((current) =>
      current.map((entry) => (entry.medId === medication.medId ? updated : entry)),
    )
    setMessage('Marked reminder as taken today.')
    notifyRecordsChanged()
  }

  async function deleteReminder(medication: MedicationRecord) {
    if (!token) return
    const confirmed = window.confirm(
      `Delete ${medication.name}? This removes the reminder from your account.`,
    )

    if (!confirmed) return

    await api.deleteRecord(token, 'medications', medication.medId)
    setMedications((current) => current.filter((entry) => entry.medId !== medication.medId))
    setMessage('Medication reminder deleted.')
    notifyRecordsChanged()
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <p className="font-semibold">Medication entries are user-managed.</p>
        <p>
          EndoBridge does not validate, prescribe, recommend, adjust, or monitor medication
          safety. Reminder alerts are best-effort and depend on browser permissions, device
          settings, and whether the app is active.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          detail="User-entered records"
          icon={<Pill size={18} />}
          label="Total reminders"
          value={medications.length.toString()}
        />
        <StatCard
          detail="Currently enabled"
          icon={<Bell size={18} />}
          label="Active reminders"
          tone="emerald"
          value={activeCount.toString()}
        />
        <StatCard
          detail="Browser-dependent alerts"
          icon={<Bell size={18} />}
          label="Alert mode"
          tone="amber"
          value={notificationMode === 'push' ? 'Browser' : 'In-app'}
        />
      </div>

      <Panel eyebrow="Module 3" title="Medication reminders">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Save physician-prescribed medication reminder labels to your account.
          </p>
          <SecondaryButton onClick={enableBrowserAlerts}>
            <Bell size={18} />
            Enable browser alerts
          </SecondaryButton>
        </div>

        <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_0.7fr_0.55fr_0.55fr_auto]" onSubmit={saveReminder}>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Medication name</span>
            <input
              aria-label="Medication name"
              className={fieldControlClass}
              onChange={(event) => {
                setMessage('')
                setForm((current) => ({ ...current, name: event.target.value }))
              }}
              value={form.name}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Dosage</span>
            <input
              aria-label="Dosage"
              className={fieldControlClass}
              onChange={(event) => {
                setMessage('')
                setForm((current) => ({ ...current, dosage: event.target.value }))
              }}
              value={form.dosage}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Schedule time</span>
            <input
              aria-label="Schedule time"
              className={fieldControlClass}
              onChange={(event) => {
                setMessage('')
                setForm((current) => ({ ...current, scheduleTime: event.target.value }))
              }}
              type="time"
              value={form.scheduleTime}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Frequency</span>
            <select
              aria-label="Frequency"
              className={fieldControlClass}
              onChange={(event) => {
                setMessage('')
                setForm((current) => ({
                  ...current,
                  frequency: event.target.value as MedicationFrequency,
                }))
              }}
              value={form.frequency}
            >
              {medicationFrequencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <PrimaryButton className="w-full" type="submit">
              <Save size={18} />
              Save reminder
            </PrimaryButton>
          </div>
        </form>

        {editingId ? (
          <SecondaryButton className="mt-3" onClick={resetForm}>
            Cancel edit
          </SecondaryButton>
        ) : null}

        <div aria-live="polite">
          {message ? <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p> : null}
        </div>

        <div className="mt-5">
          {medications.length === 0 ? (
            <EmptyState title="No medication reminders yet">
              Add reminders only for medications already prescribed by your clinician.
            </EmptyState>
          ) : (
            <div className="grid gap-3">
              {medications.map((medication) => (
                <MedicationCard
                  key={medication.medId}
                  medication={medication}
                  onDelete={deleteReminder}
                  onEdit={editReminder}
                  onMarkTaken={markTaken}
                  onToggle={toggleReminder}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>
    </section>
  )
}

function MedicationCard({
  medication,
  onDelete,
  onEdit,
  onMarkTaken,
  onToggle,
}: {
  medication: MedicationRecord
  onDelete: (medication: MedicationRecord) => void
  onEdit: (medication: MedicationRecord) => void
  onMarkTaken: (medication: MedicationRecord) => void
  onToggle: (medication: MedicationRecord) => void
}) {
  const due = isMedicationDue(medication)

  return (
    <article className="rounded-[14px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{medication.name}</h3>
            <StatusBadge tone={medication.isActive ? 'success' : 'neutral'}>
              {medication.isActive ? 'Active' : 'Paused'}
            </StatusBadge>
            {due ? <StatusBadge tone="warning">In-app reminder due</StatusBadge> : null}
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-medium text-slate-900">Dosage</dt>
              <dd className="text-slate-600">{medication.dosage}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Schedule</dt>
              <dd className="text-slate-600">
                {medication.scheduleTime} / {medication.frequency}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Next reminder</dt>
              <dd className="text-slate-600">{formatReminder(medication.nextReminderAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => onMarkTaken(medication)}>
            <Check size={17} />
            Mark taken
          </SecondaryButton>
          <SecondaryButton
            aria-label={`${medication.isActive ? 'Pause' : 'Resume'} ${medication.name}`}
            onClick={() => onToggle(medication)}
          >
            {medication.isActive ? 'Pause' : 'Resume'}
          </SecondaryButton>
          <SecondaryButton
            aria-label={`Edit ${medication.name}`}
            onClick={() => onEdit(medication)}
          >
            <Edit3 size={17} />
            Edit
          </SecondaryButton>
          <SecondaryButton
            aria-label={`Delete ${medication.name}`}
            onClick={() => onDelete(medication)}
          >
            <Trash2 size={17} />
            Delete
          </SecondaryButton>
        </div>
      </div>
    </article>
  )
}
