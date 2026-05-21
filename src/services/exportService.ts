import { LocalStorageService } from './localStorageService'

export class ExportService {
  static readonly FILE_PREFIX = 'endobridge-history'

  private readonly storage: LocalStorageService

  constructor(storage = new LocalStorageService()) {
    this.storage = storage
  }

  buildExportObject() {
    return {
      exportedAt: new Date().toISOString(),
      appVersion: '0.1.0-foundation',
      sessions: this.storage.getAllSessions(),
      symptoms: this.storage.getAllSymptoms(),
      medications: this.storage.getMedications(),
    }
  }

  exportAll() {
    const date = new Date().toISOString().slice(0, 10)
    const json = JSON.stringify(this.buildExportObject(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${ExportService.FILE_PREFIX}-${date}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
}
