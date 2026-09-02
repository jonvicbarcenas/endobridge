import type { InsightReport } from '../types/insight'
import type { LabSession } from '../types/session'

const DISCLAIMER_TEXT =
  'This output does not constitute a clinical diagnosis or medical advice. It is an observational summary of patterns in submitted data and is intended for informational tracking only. EndoBridge is not a substitute for professional medical care.'

function directionLabel(direction: string) {
  return direction === 'low' ? 'Below reference' : 'Elevated'
}

export function asciiBar(weight: number, width = 24) {
  const boundedWeight = Math.min(Math.max(weight, 0), 1)
  const filled = Math.round(boundedWeight * width)
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`
}

export function buildReportEmail(report: InsightReport, session: LabSession) {
  const reportDate = report.reportTimestamp.slice(0, 10)
  const observations =
    report.observations.length > 0
      ? report.observations.flatMap((observation, index) => [
          `${index + 1}. ${observation}`,
          `   Possible reason: ${
            report.observationReasons[index] ??
            'This may reflect the submitted lab values and recent tracking notes together.'
          }`,
        ])
      : ['No additional observations were included.']

  const graph =
    report.contributors.length > 0
      ? report.contributors.flatMap((contributor) => [
          `${contributor.rank}. ${contributor.biomarkerLabel}: ${contributor.value} ${contributor.unit} (${directionLabel(contributor.direction)})`,
          `   ${asciiBar(contributor.weight)} ${Math.round(Math.min(Math.max(contributor.weight, 0), 1) * 100)}%`,
        ])
      : ['No out-of-range contributors were included with this report.']

  return {
    subject: `EndoBridge insight report - ${reportDate}`,
    body: [
      'Hello,',
      '',
      'I am sharing my EndoBridge observational report for discussion during my appointment.',
      '',
      'REPORT DETAILS',
      `Generated: ${reportDate}`,
      `Monitoring session: ${session.sessionId.slice(0, 8)}`,
      '',
      'OBSERVATIONAL SUMMARY',
      report.observationalSummary,
      '',
      'KEY OBSERVATIONS',
      ...observations,
      '',
      'TOP CONTRIBUTING BIOMARKERS',
      'Relative contribution scale: 0%                         100%',
      ...graph,
      'Each bar shows relative contribution to this report; it does not represent diagnosis or medical risk.',
      '',
      'IMPORTANT DISCLAIMER',
      DISCLAIMER_TEXT,
      '',
      'Please review these observations alongside my clinical history and original laboratory results.',
    ].join('\n'),
  }
}

export function buildMailtoUrl(recipient: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
