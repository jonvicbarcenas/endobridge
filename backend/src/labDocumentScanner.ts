import type { BiomarkerKey } from '../../frontend/src/types/session.js'
import { backendReferenceRanges } from './referenceRanges.js'
import { inflateRawSync } from 'node:zlib'

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
  const match = dataUrl.match(/^data:(?<mime>[^;,]+);base64,(?<payload>.+)$/)
  if (!match?.groups?.payload || !match.groups.mime) {
    throw new Error('invalid lab document payload')
  }
  return {
    mimeType: match.groups.mime,
    buffer: Buffer.from(match.groups.payload, 'base64'),
  }
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

      const rawNumber = Number(rawValue)
      if (!Number.isFinite(rawNumber)) continue
      const normalized = normalizeExtractedValue(biomarker.key, rawNumber)

      extracted[biomarker.key] = {
        key: biomarker.key,
        value: normalized.value,
        unit: match?.groups?.unit ?? backendReferenceRanges[biomarker.key].unit,
        sourceLabel: normalized.adjusted ? `${label} (decimal reviewed)` : label,
        confidence: normalized.adjusted ? 'medium' : 'high',
      }
      break
    }
  }

  return extracted
}

function normalizeExtractedValue(key: BiomarkerKey, value: number) {
  const range = backendReferenceRanges[key]
  if (value >= range.plausibilityMin && value <= range.plausibilityMax) {
    return { value, adjusted: false }
  }

  const shifted = Number((value / 10).toFixed(4))
  if (shifted >= range.plausibilityMin && shifted <= range.plausibilityMax) {
    return { value: shifted, adjusted: true }
  }

  return { value, adjusted: false }
}

async function extractTextFromPdf(buffer: Buffer) {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return normalizeWhitespace(result.text)
  } finally {
    await parser.destroy()
  }
}

function stripXmlText(xml: string) {
  return normalizeWhitespace(
    xml
      .replace(/<w:tab\/>/g, ' ')
      .replace(/<\/w:p>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
  )
}

function extractTextFromDocx(buffer: Buffer) {
  let offset = 0

  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1
      continue
    }

    const compression = buffer.readUInt16LE(offset + 8)
    const compressedSize = buffer.readUInt32LE(offset + 18)
    const fileNameLength = buffer.readUInt16LE(offset + 26)
    const extraLength = buffer.readUInt16LE(offset + 28)
    const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLength)
    const dataStart = offset + 30 + fileNameLength + extraLength
    const dataEnd = dataStart + compressedSize

    if (fileName === 'word/document.xml') {
      const compressed = buffer.subarray(dataStart, dataEnd)
      const xml =
        compression === 8
          ? inflateRawSync(compressed).toString('utf8')
          : compressed.toString('utf8')
      return stripXmlText(xml)
    }

    offset = dataEnd
  }

  return ''
}

async function extractTextWithOcr(buffer: Buffer) {
  const [{ PDFParse }, { createWorker }] = await Promise.all([
    import('pdf-parse'),
    import('tesseract.js'),
  ])
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

async function extractTextFromImage(buffer: Buffer) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const result = await worker.recognize(buffer)
    return normalizeWhitespace(result.data.text)
  } finally {
    await worker.terminate()
  }
}

export async function scanLabDocument(dataUrl: string): Promise<LabDocumentScanResult> {
  const { buffer, mimeType } = decodeDataUrl(dataUrl)
  const isPdf = mimeType === 'application/pdf'
  const isImage = mimeType.startsWith('image/')
  const isText = mimeType === 'text/plain'
  const isDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  let result: {
    text: string
    sourceLabel: string
    extractionStatus: LabDocumentScanResult['extractionStatus']
  }

  if (isPdf) {
    const embeddedText = await extractTextFromPdf(buffer)
    const text = embeddedText || (await extractTextWithOcr(buffer))
    result = {
      text,
      sourceLabel: 'PDF',
      extractionStatus: embeddedText ? 'scanned' : text ? 'ocr-scanned' : 'scan-failed',
    }
  } else if (isImage) {
    const text = await extractTextFromImage(buffer)
    result = {
      text,
      sourceLabel: 'image',
      extractionStatus: text ? 'ocr-scanned' : 'scan-failed',
    }
  } else if (isText) {
    const text = normalizeWhitespace(buffer.toString('utf8'))
    result = {
      text,
      sourceLabel: 'document',
      extractionStatus: text ? 'scanned' : 'scan-failed',
    }
  } else if (isDocx) {
    const text = extractTextFromDocx(buffer)
    result = {
      text,
      sourceLabel: 'document',
      extractionStatus: text ? 'scanned' : 'scan-failed',
    }
  } else {
    throw new Error('unsupported lab document type')
  }

  const { text, extractionStatus, sourceLabel } = result
  const extractedBiomarkers = text ? extractBiomarkers(text) : {}
  const count = Object.keys(extractedBiomarkers).length

  return {
    extractionStatus,
    extractedTextPreview: text.slice(0, 800),
    extractedBiomarkers,
    scanMessage:
      extractionStatus === 'scan-failed'
        ? `No readable lab text was found in this ${sourceLabel}.`
        : `Scanned ${sourceLabel} and found ${count} biomarker ${count === 1 ? 'value' : 'values'} for review.`,
  }
}
