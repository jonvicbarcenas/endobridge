import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { InsightReport as InsightReportData } from '../types/insight'
import type { LabSession } from '../types/session'
import { InsightReport } from './InsightReport'

afterEach(cleanup)

const report: InsightReportData = {
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

describe('InsightReport sharing', () => {
  it('opens an editable, recipient-aware email draft and closes with Escape', async () => {
    const user = userEvent.setup()
    render(<InsightReport report={report} session={session} />)

    const shareButton = screen.getByRole('button', { name: 'Share report' })
    await user.click(shareButton)

    expect(screen.getByRole('dialog', { name: 'Email this report' })).toBeInTheDocument()
    expect(screen.getByLabelText('Recipient email')).toHaveFocus()
    expect(screen.getByLabelText('Subject')).toHaveValue(
      'EndoBridge insight report - 2026-09-02',
    )
    expect((screen.getByLabelText('Email message') as HTMLTextAreaElement).value).toContain(
      '[############------------] 50%',
    )

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Email this report' })).not.toBeInTheDocument()
    expect(shareButton).toHaveFocus()
  })
})
