import {
  CalendarDays,
  Check,
  ClipboardList,
  Moon,
  Pill,
  Save,
  Sparkles,
  Trash2,
  Waves,
  X,
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Field, PrimaryButton, SecondaryButton, fieldControlClass } from '../components/ui'
import { useAuth } from '../context/auth'
import { notifyRecordsChanged } from '../context/records'
import { interpretDailyLog } from '../engines/dailyLogInterpretationEngine'
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

const companionSections = [
  {
    id: 'body',
    title: 'Body signals',
    description: 'Symptoms, cycle notes, and weight context.',
    icon: Waves,
  },
  {
    id: 'rhythm',
    title: 'Daily rhythm',
    description: 'Food notes, movement, and sleep.',
    icon: Moon,
  },
  {
    id: 'mind',
    title: 'Mood & stress',
    description: 'Plain self-monitoring labels only.',
    icon: Sparkles,
  },
  {
    id: 'adherence',
    title: 'Medication note',
    description: 'User-managed adherence context.',
    icon: Pill,
  },
] as const

type CompanionSectionId = (typeof companionSections)[number]['id']
type FormState = typeof emptyForm

function createId() {
  return globalThis.crypto?.randomUUID
    ? `daily-${globalThis.crypto.randomUUID()}`
    : `daily-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function updateTextList(currentValue: string, nextValue: string) {
  const values = currentValue
    .split(', ')
    .map((value) => value.trim())
    .filter(Boolean)

  if (values.includes(nextValue)) {
    return values.filter((value) => value !== nextValue).join(', ')
  }

  return [...values, nextValue].join(', ')
}

function countCompletedFields(form: FormState) {
  return Object.values(form).filter((value) => value.trim().length > 0).length
}

function buildDailyLogRecord(form: FormState, base?: DailyLogRecord): DailyLogRecord {
  return {
    ...(base ?? {
      logId: createId(),
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }),
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
}

function formFromLog(log: DailyLogRecord): FormState {
  return {
    foodNotes: log.foodNotes,
    exercise: log.exercise,
    sleepHours: log.sleepHours !== null ? String(log.sleepHours) : '',
    mood: log.mood,
    stressLevel: log.stressLevel !== null ? String(log.stressLevel) : '',
    cycleEvent: log.cycleEvent,
    weightKg: log.weightKg !== null ? String(log.weightKg) : '',
    medicationAdherence: log.medicationAdherence,
    symptomsNote: log.symptomsNote,
  }
}

export function DailyLogsPage() {
  const { api, token } = useAuth()
  const [logs, setLogs] = useState<DailyLogRecord[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [message, setMessage] = useState('')
  const [editingLog, setEditingLog] = useState<DailyLogRecord | null>(null)
  const [activeSection, setActiveSection] = useState<CompanionSectionId>('body')

  useEffect(() => {
    if (!token) return
    api
      .listRecordData<DailyLogRecord>(token, 'daily-logs')
      .then((records) =>
        setLogs(records.sort((left, right) => Date.parse(right.date) - Date.parse(left.date))),
      )
  }, [api, token])

  const todayStr = getLocalDateString(new Date())
  const todayLog = logs.find((log) => getLocalDateString(new Date(log.date)) === todayStr)
  const completedFields = countCompletedFields(form)
  const completionLabel = `${completedFields}/9 optional areas noted`
  const latestLogs = useMemo(() => logs.slice(0, 8), [logs])

  async function saveDailyLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    if (editingLog) {
      const record = buildDailyLogRecord(form, editingLog)

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

    if (todayLog) {
      setMessage('You already have a log for today. Select it from recent logs to update it.')
      return
    }

    const record = buildDailyLogRecord(form)

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

  function selectLog(log: DailyLogRecord) {
    setEditingLog(log)
    setForm(formFromLog(log))
    setMessage('')
    setActiveSection('body')
  }

  function resetDraft(nextMessage = '') {
    setEditingLog(null)
    setForm(emptyForm)
    setMessage(nextMessage)
    setActiveSection('body')
  }

  return (
    <div className="space-y-6">
      <CompanionHero
        editing={Boolean(editingLog)}
        hasTodayLog={Boolean(todayLog)}
        onEditToday={() => {
          if (todayLog) selectLog(todayLog)
        }}
        onSkipToday={() =>
          resetDraft('Daily monitoring is optional. You may continue using EndoBridge even if you skip today’s log.')
        }
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form className="space-y-6" onSubmit={saveDailyLog}>
          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
            {/* Horizontal Sub-navigation */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {companionSections.map(({ id, title, icon: Icon }) => {
                  const isActive = activeSection === id
                  return (
                    <button
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      key={id}
                      onClick={() => setActiveSection(id)}
                      type="button"
                    >
                      <Icon size={16} />
                      <span>{title}</span>
                    </button>
                  )
                })}
              </div>
              <div className="text-right hidden sm:block">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                  <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  {completionLabel}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <CompanionSection activeSection={activeSection} form={form} setForm={setForm} />

              <div className="mt-6 border-t border-slate-200 pt-5">
                {message ? (
                  <p
                    className={`mb-4 rounded-[12px] px-3 py-2 text-sm font-medium ${
                      message.startsWith('Failed')
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {message}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <PrimaryButton disabled={!editingLog && Boolean(todayLog)} type="submit">
                    <Save size={18} />
                    {editingLog ? 'Update daily log' : 'Save daily log'}
                  </PrimaryButton>
                  {editingLog ? (
                    <>
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200"
                        onClick={() => deleteDailyLog(editingLog.logId)}
                        type="button"
                      >
                        <Trash2 size={18} />
                        Delete log
                      </button>
                      <SecondaryButton onClick={() => resetDraft()} type="button">
                        <X size={18} />
                        Cancel
                      </SecondaryButton>
                    </>
                  ) : null}
                  {!editingLog && todayLog ? (
                    <p className="text-sm font-medium text-amber-700">
                      Today already has a saved log. Select it from recent logs to update it.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
            <p className="text-sm font-semibold text-slate-950">Optional progress</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-indigo-700">{completedFields}</span>
              <span className="text-sm text-slate-500">of 9 areas noted</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${Math.min(100, (completedFields / 9) * 100)}%` }}
              />
            </div>
          </section>

          <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Recent logs</p>
                <p className="mt-1 text-xs text-slate-500">Select a log to edit it.</p>
              </div>
              <CalendarDays className="text-slate-400" size={18} />
            </div>
            {latestLogs.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No daily wellness logs yet">
                  Daily monitoring is optional and does not block lab sessions, reports, reminders, or
                  dashboard access.
                </EmptyState>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {latestLogs.map((log) => (
                  <RecentLogCard
                    isEditing={editingLog?.logId === log.logId}
                    isToday={getLocalDateString(new Date(log.date)) === todayStr}
                    key={log.logId}
                    log={log}
                    onDelete={deleteDailyLog}
                    onSelect={selectLog}
                  />
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  )
}

function CompanionHero({
  editing,
  hasTodayLog,
  onEditToday,
  onSkipToday,
}: {
  editing: boolean
  hasTodayLog: boolean
  onEditToday: () => void
  onSkipToday: () => void
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-indigo-100 bg-white p-6 sm:p-8 shadow-sm shadow-slate-200/70">
      <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
        <ClipboardList size={14} />
        Everyday companion
      </div>
      <h1 className="mt-4 text-2xl font-semibold leading-8 text-slate-950 sm:text-3xl">
        {editing ? 'Update your daily wellness check-in' : 'How is today going?'}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
        Log only what you want to track today. EndoBridge stores these notes as self-monitoring
        context and does not generate treatment, diet, exercise, or medication advice.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {hasTodayLog && !editing ? (
          <SecondaryButton onClick={onEditToday} type="button">
            <CalendarDays size={17} />
            Edit today’s log
          </SecondaryButton>
        ) : null}
        <SecondaryButton onClick={onSkipToday} type="button">
          Skip today
        </SecondaryButton>
      </div>
    </section>
  )
}

function CompanionSection({
  activeSection,
  form,
  setForm,
}: {
  activeSection: CompanionSectionId
  form: FormState
  setForm: (updater: (current: FormState) => FormState) => void
}) {
  if (activeSection === 'body') {
    return (
      <SectionShell
        description="Track cycle events and PCOS-related symptoms as personal observations."
        icon={<Waves size={20} />}
        title="Body signals"
      >
        <ChipGroup
          label="Cycle event"
          onSelect={(value) => setForm((current) => ({ ...current, cycleEvent: value }))}
          options={['No cycle event', 'Period started', 'Period ended', 'Spotting', 'Cramps', 'Irregular timing']}
          value={form.cycleEvent}
        />
        <Field label="Symptoms note">
          <textarea
            className={`${fieldControlClass} min-h-24`}
            onChange={(event) =>
              setForm((current) => ({ ...current, symptomsNote: event.target.value }))
            }
            placeholder="Optional notes such as acne, fatigue, bloating, cravings, hirsutism-related concerns, or weight changes."
            value={form.symptomsNote}
          />
        </Field>
        <ChipGroup
          allowMultiple
          label="Quick symptom tags"
          onSelect={(value) =>
            setForm((current) => ({
              ...current,
              symptomsNote: updateTextList(current.symptomsNote, value),
            }))
          }
          options={['Acne', 'Fatigue', 'Bloating', 'Cramps', 'Cravings', 'Hirsutism concern', 'Weight change']}
          value={form.symptomsNote}
        />
        <Field label="Weight / weight change context">
          <input
            className={fieldControlClass}
            onChange={(event) => setForm((current) => ({ ...current, weightKg: event.target.value }))}
            placeholder="Optional kg value"
            step="0.1"
            type="number"
            value={form.weightKg}
          />
        </Field>
      </SectionShell>
    )
  }

  if (activeSection === 'rhythm') {
    return (
      <SectionShell
        description="Capture daily rhythm context without turning it into recommendations."
        icon={<Moon size={20} />}
        title="Daily rhythm"
      >
        <Field label="Food notes">
          <textarea
            className={`${fieldControlClass} min-h-24`}
            onChange={(event) => setForm((current) => ({ ...current, foodNotes: event.target.value }))}
            placeholder="Meal category, appetite, cravings, or any note you want to remember."
            value={form.foodNotes}
          />
        </Field>
        <ChipGroup
          allowMultiple
          label="Food note tags"
          onSelect={(value) =>
            setForm((current) => ({
              ...current,
              foodNotes: updateTextList(current.foodNotes, value),
            }))
          }
          options={['Regular meals', 'Light appetite', 'Cravings', 'Skipped meal', 'Hydration note']}
          value={form.foodNotes}
        />
        <Field label="Exercise / activity">
          <input
            className={fieldControlClass}
            onChange={(event) => setForm((current) => ({ ...current, exercise: event.target.value }))}
            placeholder="Type, duration, and intensity if you want to track it."
            value={form.exercise}
          />
        </Field>
        <ChipGroup
          label="Activity type"
          onSelect={(value) => setForm((current) => ({ ...current, exercise: value }))}
          options={['Rest day', 'Walk', 'Stretching', 'Workout', 'Active chores']}
          value={form.exercise}
        />
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
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Quick sleep entry</p>
          <div className="grid grid-cols-5 gap-2">
            {[5, 6, 7, 8, 9].map((hours) => (
              <button
                className={`min-h-11 rounded-[12px] border text-sm font-semibold transition ${
                  form.sleepHours === String(hours)
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
                }`}
                key={hours}
                onClick={() => setForm((current) => ({ ...current, sleepHours: String(hours) }))}
                type="button"
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>
      </SectionShell>
    )
  }

  if (activeSection === 'mind') {
    return (
      <SectionShell
        description="Mood and stress labels are stored for later observational trend summaries."
        icon={<Sparkles size={20} />}
        title="Mood & stress"
      >
        <ChipGroup
          label="Mood"
          onSelect={(value) => setForm((current) => ({ ...current, mood: value }))}
          options={['Calm', 'Okay', 'Low energy', 'Irritable', 'Anxious', 'Good']}
          value={form.mood}
        />
        <Field label="Mood note">
          <input
            className={fieldControlClass}
            onChange={(event) => setForm((current) => ({ ...current, mood: event.target.value }))}
            placeholder="Optional plain-language mood label"
            value={form.mood}
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Stress level (1-10)</p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
              <button
                className={`min-h-11 rounded-[12px] border text-sm font-semibold transition ${
                  form.stressLevel === String(level)
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
                }`}
                key={level}
                onClick={() => setForm((current) => ({ ...current, stressLevel: String(level) }))}
                type="button"
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </SectionShell>
    )
  }

  return (
    <SectionShell
      description="Medication entries are user-managed and only stored as adherence context."
      icon={<Pill size={20} />}
      title="Medication note"
    >
      <ChipGroup
        label="Adherence note"
        onSelect={(value) => setForm((current) => ({ ...current, medicationAdherence: value }))}
        options={['Taken as prescribed', 'Skipped', 'Missed', 'Not applicable', 'Reminder only']}
        value={form.medicationAdherence}
      />
      <Field label="Medication adherence notes">
        <textarea
          className={`${fieldControlClass} min-h-24`}
          onChange={(event) =>
            setForm((current) => ({ ...current, medicationAdherence: event.target.value }))
          }
          placeholder="Optional note only. EndoBridge does not validate medication safety, dosage, or prescriptions."
          value={form.medicationAdherence}
        />
      </Field>
      <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Medication reminders and adherence notes are for personal tracking. EndoBridge does not
        prescribe, validate, adjust, or monitor medication safety.
      </div>
    </SectionShell>
  )
}

function SectionShell({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-700">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-5">{children}</div>
    </div>
  )
}

function ChipGroup({
  allowMultiple = false,
  label,
  onSelect,
  options,
  value,
}: {
  allowMultiple?: boolean
  label: string
  onSelect: (value: string) => void
  options: string[]
  value: string
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = allowMultiple
            ? value
                .split(', ')
                .map((entry) => entry.trim())
                .includes(option)
            : value === option

          return (
            <button
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                selected
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
              }`}
              key={option}
              onClick={() => onSelect(option)}
              type="button"
            >
              {selected ? <Check size={15} /> : null}
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}


function RecentLogCard({
  isEditing,
  isToday,
  log,
  onDelete,
  onSelect,
}: {
  isEditing: boolean
  isToday: boolean
  log: DailyLogRecord
  onDelete: (logId: string) => void
  onSelect: (log: DailyLogRecord) => void
}) {
  const interpretation = interpretDailyLog(log)

  return (
    <article
      className={`group relative rounded-[12px] border p-3 transition ${
        isEditing
          ? 'border-indigo-600 bg-indigo-50/50'
          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
      }`}
    >
      <button className="w-full text-left" onClick={() => onSelect(log)} type="button">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
          <CalendarDays size={16} className="text-slate-500" />
          {new Date(log.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          {isToday ? (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
              Today
            </span>
          ) : null}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">
          {log.mood || log.symptomsNote || log.cycleEvent || log.foodNotes || 'Saved wellness entry'}
        </p>
        <p className="mt-2 rounded-[10px] bg-white px-3 py-2 text-xs leading-5 text-slate-600">
          {interpretation.plainLanguage}
        </p>
      </button>
      <button
        aria-label="Delete daily log"
        className="absolute right-2 top-2 rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-rose-600"
        onClick={(event) => {
          event.stopPropagation()
          onDelete(log.logId)
        }}
        type="button"
      >
        <Trash2 size={15} />
      </button>
    </article>
  )
}
