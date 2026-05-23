import { StatusBadge } from './ui'
import type { SymptomSeverity } from '../types/session'

function severityTone(severity: SymptomSeverity | null) {
  if (severity === 'severe') return 'danger'
  if (severity === 'moderate') return 'warning'
  if (severity === 'mild') return 'success'
  return 'neutral'
}

function severityLabel(severity: SymptomSeverity | null) {
  if (!severity) return 'Not logged'
  if (severity === 'none') return 'None'
  return severity[0].toUpperCase() + severity.slice(1)
}

export function SymptomSeverityBadge({ severity }: { severity: SymptomSeverity | null }) {
  return <StatusBadge tone={severityTone(severity)}>{severityLabel(severity)}</StatusBadge>
}
