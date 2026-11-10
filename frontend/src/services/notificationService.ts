import { formatDosage } from '../config/medications'
import type { MedicationRecord } from '../types/session'

export type AlertMode = 'push' | 'in-app'

export const alertModeChangedEvent = 'endobridge:alert-mode-changed'

/** Current alert mode without prompting the user. */
export function currentAlertMode(): AlertMode {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'in-app'
  return Notification.permission === 'granted' ? 'push' : 'in-app'
}

export function registerReminderServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Without a service worker, desktop browsers can still use `new Notification`.
  })
}

export class NotificationService {
  mode: AlertMode = currentAlertMode()

  async init() {
    if (!('Notification' in window)) {
      this.mode = 'in-app'
      return this.mode
    }

    const permission =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission
    this.mode = permission === 'granted' ? 'push' : 'in-app'
    window.dispatchEvent(new Event(alertModeChangedEvent))
    return this.mode
  }

  /**
   * Shows a system notification. Returns false when the browser blocked it, so
   * the caller can rely on the in-app banner instead.
   */
  async sendReminder(medication: MedicationRecord) {
    if (currentAlertMode() !== 'push') return false
    const title = `Medication reminder: ${medication.name}`
    const options: NotificationOptions = {
      body: `${formatDosage(medication)} scheduled for ${medication.scheduleTime}`,
      tag: `med-${medication.medId}`,
      icon: '/favicon.svg',
    }

    try {
      const registration = await navigator.serviceWorker?.getRegistration()
      if (registration) {
        await registration.showNotification(title, options)
        return true
      }
    } catch {
      // fall through to the page-level API
    }

    try {
      new Notification(title, options)
      return true
    } catch {
      return false
    }
  }
}
