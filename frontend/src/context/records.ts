export const recordsChangedEvent = 'endobridge:records-changed'

export function notifyRecordsChanged() {
  window.dispatchEvent(new Event(recordsChangedEvent))
}
