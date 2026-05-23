import { Bell, Check, Edit3, Pill, Save, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { calculateNextReminderAt, isMedicationDue, medicationFrequencyOptions } from '../config/medications'
import { LocalStorageService } from '../services/localStorageService'
import { NotificationService } from '../services/notificationService'
import type { MedicationFrequency, MedicationRecord } from '../types/session'
import { Panel, PrimaryButton, SecondaryButton, StatusBadge } from '../components/ui'

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
  const storage = useMemo(() => new LocalStorageService(), [])
  const notificationService = useMemo(() => new NotificationService(), [])
  const [medications, setMedications] = useState<MedicationRecord[]>(() =>
    storage.getMedications(),
  )
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [notificationMode, setNotificationMode] = useState<'push' | 'in-app' | null>(null)

  const activeCount = medications.filter((medication) => medication.isActive).length

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function reloadMedications() {
    setMedications(storage.getMedications())
  }

  async function enableBrowserAlerts() {
    const mode = await notificationService.init()
    setNotificationMode(mode)
    storage.getMedications().forEach((medication) => notificationService.scheduleReminder(medication))
    setMessage(
      mode === 'push'
        ? 'Browser alerts are enabled for supported reminders.'
        : 'Using in-app reminders because browser alerts are unavailable.',
    )
  }

  function saveReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

    storage.saveMedication(medication)
    notificationService.scheduleReminder(medication)
    reloadMedications()
    resetForm()
    setMessage('Medication reminder saved locally.')
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

  function toggleReminder(medication: MedicationRecord) {
    const isActive = !medication.isActive
    storage.updateMedication(medication.medId, {
      isActive,
      nextReminderAt: isActive
        ? calculateNextReminderAt({
            scheduleTime: medication.scheduleTime,
            frequency: medication.frequency,
          })
        : null,
    })
    reloadMedications()
    setMessage(isActive ? 'Reminder resumed.' : 'Reminder paused.')
  }

  function markTaken(medication: MedicationRecord) {
    storage.updateMedication(medication.medId, {
      lastTakenAt: new Date().toISOString(),
      nextReminderAt: calculateNextReminderAt({
        scheduleTime: medication.scheduleTime,
        frequency: medication.frequency,
      }),
    })
    reloadMedications()
    setMessage('Marked reminder as taken today.')
  }

  function deleteReminder(medication: MedicationRecord) {
    const confirmed = window.confirm(
      `Delete ${medication.name}? This removes the reminder only from this browser.`,
    )

    if (!confirmed) return

    storage.deleteMedication(medication.medId)
    reloadMedications()
    setMessage('Medication reminder deleted.')
  }

  return (
    <section className="space-y-6">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <p className="font-semibold">Medication entries are user-managed.</p>
        <p>
          EndoBridge does not validate, prescribe, recommend, adjust, or monitor medication
          safety. Reminder alerts are best-effort and depend on browser permissions, device
          settings, and whether the app is active.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total reminders" value={medications.length.toString()} />
        <StatCard label="Active reminders" value={activeCount.toString()} />
        <StatCard label="Alert mode" value={notificationMode === 'push' ? 'Browser' : 'In-app'} />
      </div>

      <Panel title="Medication reminders">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Save physician-prescribed medication reminder labels locally in this browser.
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
              className="w-full rounded-md border border-slate-300 px-3 py-2"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2"
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
            <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
              No active medications. Add your first reminder using the form above.
            </div>
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
    <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Pill size={18} />
        <span className="text-xs font-medium uppercase tracking-normal">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}
