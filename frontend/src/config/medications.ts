import type { MedicationFrequency, MedicationRecord } from '../types/session'

export const medicationFrequencyOptions: { value: MedicationFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'asNeeded', label: 'As needed' },
]

export const medicationForms = [
  'Tablet',
  'Capsule',
  'Syrup / oral liquid',
  'Suspension',
  'Injection',
  'Cream / gel',
  'Patch',
  'Drops',
  'Inhaler',
  'Other',
] as const

/** Units that make sense for each form; the first one is the default. */
export const dosageUnitsByForm: Record<(typeof medicationForms)[number], string[]> = {
  Tablet: ['mg', 'mcg', 'g', 'tablet(s)'],
  Capsule: ['mg', 'mcg', 'g', 'capsule(s)'],
  'Syrup / oral liquid': ['mL', 'tsp', 'tbsp', 'mg/5 mL'],
  Suspension: ['mL', 'mg/5 mL', 'tsp'],
  Injection: ['mL', 'units', 'IU', 'mg', 'mcg'],
  'Cream / gel': ['application(s)', 'g', 'fingertip unit(s)'],
  Patch: ['patch(es)', 'mcg/hour', 'mg/24 hours'],
  Drops: ['drop(s)', 'mL'],
  Inhaler: ['puff(s)', 'mcg'],
  Other: ['dose(s)', 'mg', 'mL', 'units'],
}

export function formatDosage(medication: { dosage: string; dosageForm?: string }) {
  return medication.dosageForm ? `${medication.dosage} (${medication.dosageForm})` : medication.dosage
}

/** Days of the next week (starting today) on which a reminder is scheduled. */
export function reminderDaysThisWeek(
  medication: { frequency: MedicationFrequency; isActive: boolean; nextReminderAt: string | null; createdAt: string },
  start = new Date(),
) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() + index)
    return day
  })
  if (!medication.isActive || medication.frequency === 'asNeeded') return days.map(() => false)
  if (medication.frequency === 'daily') return days.map(() => true)
  const anchor = new Date(medication.nextReminderAt ?? medication.createdAt)
  return days.map((day) => day.getDay() === anchor.getDay())
}

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
