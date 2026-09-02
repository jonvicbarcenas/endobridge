import { describe, expect, it } from 'vitest'
import type { InsightReport } from '../types/insight'
import type { LabSession } from '../types/session'
import { asciiBar, buildMailtoUrl, buildReportEmail } from './reportEmail'

const report: InsightReport = {
  observationalSummary: 'LDL-C was above the configured reference range.',
  observations: ['The submitted LDL-C value was elevated.'],
  observationReasons: ['This reflects the submitted LDL-C measurement.'],
  contributors: [
    {
      rank: 1,
      key: 'ldlC',
      weight: 0.5,
      biomarkerLabel: 'LDL-C',
      value: 180,
      unit: 'mg/dL',
      direction: 'high',
    },
  ],
  reportTimestamp: '2026-09-02T08:00:00.000Z',
}

const session = {
  sessionId: 'session-12345678',
  timestamp: '2026-09-02T07:00:00.000Z',
} as LabSession

describe('report email', () => {
  it('generates a summary and an ASCII contributor graph', () => {
    const email = buildReportEmail(report, session)

    expect(email.subject).toBe('EndoBridge insight report - 2026-09-02')
    expect(email.body).toContain('OBSERVATIONAL SUMMARY\nLDL-C was above')
    expect(email.body).toContain('KEY OBSERVATIONS\n1. The submitted LDL-C value was elevated.')
    expect(email.body).toContain('[############------------] 50%')
    expect(email.body).toContain('IMPORTANT DISCLAIMER')
  })

  it('bounds graph values and safely encodes the mail draft', () => {
    expect(asciiBar(2, 4)).toBe('[####]')
    expect(asciiBar(-1, 4)).toBe('[----]')

    const url = buildMailtoUrl(' doctor@example.com ', 'Report & notes', 'Line 1\nLine 2')
    expect(url).toBe(
      'mailto:doctor%40example.com?subject=Report%20%26%20notes&body=Line%201%0ALine%202',
    )
  })
})
