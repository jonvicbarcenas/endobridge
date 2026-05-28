export interface UserRecord {
  userId: string
  email: string
  passwordHash: string
  createdAt: string
}

export interface SessionRecord {
  token: string
  userId: string
  createdAt: string
}

export interface TermsAcceptanceRecord {
  acceptanceId: string
  userId: string
  acceptedTerms: boolean
  acceptedPrivacy: boolean
  confirmedAge: boolean
  acceptedDisclaimer: boolean
  acceptedAt: string
}

export interface AccountScopedRecord {
  id: string
  userId: string
  createdAt: string
  data: unknown
}

export type MonitoringCollection =
  | 'labSessions'
  | 'questionnaireResponses'
  | 'symptoms'
  | 'medications'
  | 'medicationReminders'
  | 'medicationAdherence'
  | 'dailyLogs'
  | 'cycleLogs'
  | 'reports'
  | 'labDocuments'

export interface DataDeletionRecord {
  deletionId: string
  userId: string
  deletedDataType: MonitoringCollection | 'all'
  requestedAt: string
  completedAt: string
}

export interface AuthenticatedUser {
  userId: string
  email: string
}
