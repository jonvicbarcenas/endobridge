import type { MedicationFrequency, MedicationRecord } from '../types/session'

export const medicationFrequencyOptions: { value: MedicationFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'asNeeded', label: 'As needed' },
]

export function calculateNextReminderAt({
  scheduleTime,
  frequency,
  from = new Date(),
}: {
  scheduleTime: string
  frequency: MedicationFrequency
  from?: Date
}) {
  if (frequency === 'asNeeded') return null

  const [hours = '0', minutes = '0'] = scheduleTime.split(':')
  const next = new Date(from)
  next.setHours(Number(hours), Number(minutes), 0, 0)

  if (next <= from) {
    if (frequency === 'weekly') {
      next.setDate(next.getDate() + 7)
    } else {
      next.setDate(next.getDate() + 1)
    }
  }

  return next.toISOString()
}

export function isMedicationDue(medication: MedicationRecord, at = new Date()) {
  return Boolean(
    medication.isActive &&
      medication.nextReminderAt &&
      Date.parse(medication.nextReminderAt) <= at.getTime(),
  )
}
