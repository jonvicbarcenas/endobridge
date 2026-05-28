import { PDFParse } from 'pdf-parse'
import { createWorker } from 'tesseract.js'
import type { BiomarkerKey } from '../../frontend/src/types/session.js'
import { backendReferenceRanges } from './referenceRanges.js'

export interface ExtractedBiomarkerValue {
  key: BiomarkerKey
  value: number
  unit: string
  sourceLabel: string
  confidence: 'high' | 'medium'
}

export interface LabDocumentScanResult {
  extractionStatus: 'scanned' | 'ocr-scanned' | 'scan-failed'
  extractedTextPreview: string
  extractedBiomarkers: Partial<Record<BiomarkerKey, ExtractedBiomarkerValue>>
  scanMessage: string
}

const biomarkerPatterns: Array<{
  key: BiomarkerKey
  labels: string[]
}> = [
  { key: 'ldlC', labels: ['LDL-C', 'LDL C', 'LDL cholesterol', 'LDL'] },
  { key: 'fastingGlucose', labels: ['fasting glucose', 'glucose fasting', 'FBS', 'fasting blood glucose'] },
  { key: 'fastingInsulin', labels: ['fasting insulin', 'insulin fasting', 'insulin'] },
  { key: 'totalTestosterone', labels: ['total testosterone', 'testosterone total', 'testosterone'] },
  { key: 'amh', labels: ['AMH', 'anti mullerian hormone', 'anti-mullerian hormone'] },
  { key: 'lhFshRatio', labels: ['LH/FSH ratio', 'LH FSH ratio', 'LH:FSH ratio'] },
  { key: 'dheas', labels: ['DHEAS', 'DHEA-S', 'DHEA sulfate', 'DHEA sulphate'] },
]

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:application\/pdf;base64,(?<payload>.+)$/)
  if (!match?.groups?.payload) {
    throw new Error('invalid PDF payload')
  }
  return Buffer.from(match.groups.payload, 'base64')
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function extractBiomarkers(text: string) {
  const extracted: Partial<Record<BiomarkerKey, ExtractedBiomarkerValue>> = {}

  for (const biomarker of biomarkerPatterns) {
    for (const label of biomarker.labels) {
      const pattern = new RegExp(
        `${escapeRegex(label)}\\s*(?:[:=\\-]|is)?\\s*(?<value>-?\\d+(?:\\.\\d+)?)\\s*(?<unit>[a-zA-Z/%\\u00B5\\u03BC.]+)?`,
        'i',
      )
      const match = text.match(pattern)
      const rawValue = match?.groups?.value
      if (!rawValue) continue

      const value = Number(rawValue)
      if (!Number.isFinite(value)) continue

      extracted[biomarker.key] = {
        key: biomarker.key,
        value,
        unit: match?.groups?.unit ?? backendReferenceRanges[biomarker.key].unit,
        sourceLabel: label,
        confidence: 'high',
      }
      break
    }
  }

  return extracted
}

async function extractTextFromPdf(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return normalizeWhitespace(result.text)
  } finally {
    await parser.destroy()
  }
}

async function extractTextWithOcr(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer })
  const worker = await createWorker('eng')
  try {
    const screenshot = await parser.getScreenshot({ scale: 2, partial: [1] })
    const pages = screenshot.pages as Array<{ data: Uint8Array }>
    const firstPage = pages[0]
    if (!firstPage) return ''

    const result = await worker.recognize(Buffer.from(firstPage.data))
    return normalizeWhitespace(result.data.text)
  } finally {
    await worker.terminate()
    await parser.destroy()
  }
}

export async function scanLabDocument(dataUrl: string): Promise<LabDocumentScanResult> {
  const buffer = decodeDataUrl(dataUrl)
  const embeddedText = await extractTextFromPdf(buffer)
  const text = embeddedText || (await extractTextWithOcr(buffer))
  const extractionStatus = embeddedText ? 'scanned' : text ? 'ocr-scanned' : 'scan-failed'
  const extractedBiomarkers = text ? extractBiomarkers(text) : {}
  const count = Object.keys(extractedBiomarkers).length

  return {
    extractionStatus,
    extractedTextPreview: text.slice(0, 800),
    extractedBiomarkers,
    scanMessage:
      extractionStatus === 'scan-failed'
        ? 'No readable lab text was found in this PDF.'
        : `Scanned PDF and found ${count} biomarker ${count === 1 ? 'value' : 'values'} for review.`,
  }
}
