import type { MedicationRecord } from '../types/session'

export class NotificationService {
  mode: 'push' | 'in-app' = 'in-app'

  async init() {
    if (!('Notification' in window)) {
      this.mode = 'in-app'
      return this.mode
    }

    const permission = await Notification.requestPermission()
    this.mode = permission === 'granted' ? 'push' : 'in-app'
    return this.mode
  }

  scheduleReminder(medication: MedicationRecord) {
    if (!medication.nextReminderAt || !medication.isActive) return

    const delay = Math.max(Date.parse(medication.nextReminderAt) - Date.now(), 0)

    window.setTimeout(() => {
      this.sendReminder(medication)
    }, delay)
  }

  sendReminder(medication: MedicationRecord) {
    if (this.mode === 'push' && 'Notification' in window) {
      new Notification(`Medication reminder: ${medication.name}`, {
        body: `${medication.dosage} scheduled for ${medication.scheduleTime}`,
      })
    }
  }
}
