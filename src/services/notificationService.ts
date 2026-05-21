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

  scheduleReminder(title: string, body: string) {
    if (this.mode === 'push' && 'Notification' in window) {
      new Notification(title, { body })
    }
  }
}
