import type { BiomarkerKey } from '../../frontend/src/types/session.js'
import { backendReferenceRanges } from './referenceRanges.js'
import { inflateRawSync } from 'node:zlib'
import { request as httpsRequest } from 'node:https'

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

export interface GeminiHttpResponse {
  ok: boolean
  status: number
  data: unknown
}

export type GeminiTransport = (
  endpoint: URL,
  body: unknown,
  timeoutMs: number,
) => Promise<GeminiHttpResponse>

export interface ScanOptions {
  transport?: GeminiTransport
  apiKey?: string
  model?: string
}

export interface GeminiVisionExtractionResult {
  biomarkers: Partial<Record<BiomarkerKey, ExtractedBiomarkerValue>>
  documentSummary: string
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
const MAX_DOCUMENT_BYTES = 6_000_000
const MAX_DOCX_XML_BYTES = 2_000_000
const DEFAULT_GEMINI_VISION_MODEL = 'models/gemini-1.5-flash'
const GEMINI_VISION_TIMEOUT_MS = 20_000

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function normalizeModelName(model: string) {
  return model.startsWith('models/') ? model : `models/${model}`
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(?<mime>[^;,]+);base64,(?<payload>.+)$/)
  if (!match?.groups?.payload || !match.groups.mime) {
    throw new Error('invalid lab document payload')
  }
  if (!allowedMimeTypes.has(match.groups.mime) || !/^[A-Za-z0-9+/]+={0,2}$/.test(match.groups.payload)) {
    throw new Error('unsupported lab document type')
  }
  const buffer = Buffer.from(match.groups.payload, 'base64')
  if (!buffer.length || buffer.length > MAX_DOCUMENT_BYTES) {
    throw new Error('lab document exceeds size limit')
  }
  assertFileSignature(match.groups.mime, buffer)
  return {
    mimeType: match.groups.mime,
    buffer,
  }
}

function assertFileSignature(mimeType: string, buffer: Buffer) {
  const valid =
    (mimeType === 'application/pdf' && buffer.subarray(0, 5).toString('ascii') === '%PDF-') ||
    (mimeType === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) ||
    (mimeType === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) ||
    (mimeType === 'image/webp' &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP') ||
    (mimeType === 'text/plain' && !buffer.includes(0)) ||
    (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      buffer.subarray(0, 2).toString('ascii') === 'PK')
  if (!valid) throw new Error('lab document content does not match its declared type')
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
  try {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return normalizeWhitespace(result.text)
    } finally {
      await parser.destroy()
    }
  } catch {
    return ''
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

    if (dataStart > buffer.length || dataEnd > buffer.length || dataEnd < dataStart) {
      throw new Error('invalid DOCX archive')
    }

    if (fileName === 'word/document.xml') {
      const compressed = buffer.subarray(dataStart, dataEnd)
      const xml =
        compression === 8
          ? inflateRawSync(compressed, { maxOutputLength: MAX_DOCX_XML_BYTES }).toString('utf8')
          : compressed.toString('utf8')
      if (Buffer.byteLength(xml, 'utf8') > MAX_DOCX_XML_BYTES) {
        throw new Error('DOCX document text exceeds size limit')
      }
      return stripXmlText(xml)
    }

    offset = dataEnd
  }

  return ''
}

async function extractTextWithOcr(buffer: Buffer) {
  try {
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
  } catch {
    return ''
  }
}

async function extractTextFromImage(buffer: Buffer) {
  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')
    try {
      const result = await worker.recognize(buffer)
      return normalizeWhitespace(result.data.text)
    } finally {
      await worker.terminate()
    }
  } catch {
    return ''
  }
}

export function defaultGeminiTransport(
  endpoint: URL,
  body: unknown,
  timeoutMs: number,
): Promise<GeminiHttpResponse> {
  const requestBody = JSON.stringify(body)

  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (response) => {
        let responseBody = ''

        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          responseBody += chunk
        })
        response.on('end', () => {
          try {
            resolve({
              ok: response.statusCode ? response.statusCode >= 200 && response.statusCode < 300 : false,
              status: response.statusCode ?? 0,
              data: responseBody ? JSON.parse(responseBody) : null,
            })
          } catch (error) {
            reject(error)
          }
        })
      },
    )

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Gemini API request timed out'))
    })
    req.on('error', reject)
    req.end(requestBody)
  })
}

export function buildGeminiVisionRequest(mimeType: string, base64Buffer: string) {
  return {
    systemInstruction: {
      parts: [
        {
          text:
            'You are an expert clinical laboratory document extraction engine for EndoBridge. ' +
            'Your job is to visually inspect the provided lab document image or PDF and extract the patient\'s ACTUAL lab test values for any of the 7 supported biomarkers.\n' +
            'CRITICAL EXTRACTION RULES:\n' +
            '1. Extract ONLY the patient\'s actual test result value. NEVER extract reference intervals, normal ranges, biological reference ranges, flagged indicators, or high/low limits as patient values.\n' +
            '2. Extract numeric values only. If a result says "< 0.1" or "> 100", extract the numeric portion.\n' +
            '3. Read the exact unit printed for that test (e.g. mg/dL, ng/mL, uIU/mL, pmol/L, etc.).\n' +
            '4. Provide the exact test label / test name found on the report (e.g. "Glucose, Fasting", "LDL-Cholesterol Calculated", "AMH ECLIA").\n' +
            '5. Do NOT guess or hallucinate. If a biomarker is not in the document, do NOT include it in the biomarkers list.\n' +
            '6. Provide a concise document summary (up to 300 characters) indicating document source or header info.\n' +
            'Return JSON only.',
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Buffer,
            },
          },
          {
            text:
              'Analyze this medical laboratory document and extract any of the following 7 biomarker values present: ' +
              'ldlC (LDL-C / LDL Cholesterol), ' +
              'fastingGlucose (Fasting Blood Sugar / Glucose Fasting / FBS), ' +
              'fastingInsulin (Fasting Insulin / Insulin Fasting), ' +
              'totalTestosterone (Total Testosterone), ' +
              'amh (Anti-Müllerian Hormone / AMH), ' +
              'lhFshRatio (LH/FSH ratio or LH to FSH ratio), ' +
              'dheas (DHEA-S / DHEA Sulfate / DHEAS).',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          documentSummary: { type: 'string' },
          biomarkers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  enum: [
                    'ldlC',
                    'fastingGlucose',
                    'fastingInsulin',
                    'totalTestosterone',
                    'amh',
                    'lhFshRatio',
                    'dheas',
                  ],
                },
                value: { type: 'number' },
                unit: { type: 'string' },
                sourceLabel: { type: 'string' },
              },
              required: ['key', 'value', 'unit', 'sourceLabel'],
            },
          },
        },
        required: ['documentSummary', 'biomarkers'],
      },
    },
  }
}

export function extractGeminiVisionText(response: unknown): string {
  if (!isPlainObject(response) || !Array.isArray(response.candidates)) {
    throw new Error('malformed Gemini response')
  }

  const candidate = response.candidates[0]
  if (!isPlainObject(candidate) || !isPlainObject(candidate.content)) {
    throw new Error('malformed Gemini response')
  }

  const parts = candidate.content.parts
  if (!Array.isArray(parts)) {
    throw new Error('malformed Gemini response')
  }

  const text = parts
    .map((part) => {
      if (isPlainObject(part) && (part.thought === true || 'thought' in part)) {
        return ''
      }
      return isPlainObject(part) && typeof part.text === 'string' ? part.text : ''
    })
    .join('')
    .trim()

  if (!text) {
    throw new Error('empty Gemini response')
  }

  return text
}

export function parseGeminiVisionResponse(rawJson: string): GeminiVisionExtractionResult {
  const parsed = JSON.parse(stripJsonFence(rawJson))
  if (!isPlainObject(parsed) || !Array.isArray(parsed.biomarkers)) {
    throw new Error('malformed Gemini vision payload')
  }

  const documentSummary = typeof parsed.documentSummary === 'string' ? parsed.documentSummary.trim() : ''
  const extracted: Partial<Record<BiomarkerKey, ExtractedBiomarkerValue>> = {}
  const validKeys = new Set([
    'ldlC',
    'fastingGlucose',
    'fastingInsulin',
    'totalTestosterone',
    'amh',
    'lhFshRatio',
    'dheas',
  ])

  for (const item of parsed.biomarkers) {
    if (!isPlainObject(item)) continue
    const key = item.key as BiomarkerKey
    if (!validKeys.has(key)) continue

    const rawNumber = Number(item.value)
    if (!Number.isFinite(rawNumber)) continue

    const normalized = normalizeExtractedValue(key, rawNumber)
    const label =
      typeof item.sourceLabel === 'string' && item.sourceLabel.trim()
        ? item.sourceLabel.trim()
        : key
    const unit =
      typeof item.unit === 'string' && item.unit.trim()
        ? item.unit.trim()
        : backendReferenceRanges[key].unit

    extracted[key] = {
      key,
      value: normalized.value,
      unit,
      sourceLabel: normalized.adjusted ? `${label} (decimal reviewed)` : label,
      confidence: normalized.adjusted ? 'medium' : 'high',
    }
  }

  return {
    biomarkers: extracted,
    documentSummary,
  }
}

export async function extractBiomarkersWithGeminiVision(
  mimeType: string,
  buffer: Buffer,
  options?: ScanOptions,
): Promise<GeminiVisionExtractionResult | null> {
  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const model = normalizeModelName(
    options?.model ??
      process.env.GEMINI_VISION_MODEL ??
      process.env.GEMINI_MODEL ??
      DEFAULT_GEMINI_VISION_MODEL,
  )
  const transport = options?.transport ?? defaultGeminiTransport
  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
  )

  const payload = buildGeminiVisionRequest(mimeType, buffer.toString('base64'))
  const response = await transport(endpoint, payload, GEMINI_VISION_TIMEOUT_MS)
  if (!response.ok) {
    throw new Error(`Gemini Vision API responded with status ${response.status}`)
  }

  const rawText = extractGeminiVisionText(response.data)
  return parseGeminiVisionResponse(rawText)
}

function formatBiomarkerPreview(
  biomarkers: Partial<Record<BiomarkerKey, ExtractedBiomarkerValue>>,
): string {
  return Object.values(biomarkers)
    .filter((b): b is ExtractedBiomarkerValue => Boolean(b))
    .map((b) => `${b.sourceLabel}: ${b.value} ${b.unit}`)
    .join('\n')
}

export async function scanLabDocument(
  dataUrl: string,
  options?: ScanOptions,
): Promise<LabDocumentScanResult> {
  const { buffer, mimeType } = decodeDataUrl(dataUrl)
  const isPdf = mimeType === 'application/pdf'
  const isImage = mimeType.startsWith('image/')
  const isText = mimeType === 'text/plain'
  const isDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  if (isText) {
    const text = normalizeWhitespace(buffer.toString('utf8'))
    const extractedBiomarkers = text ? extractBiomarkers(text) : {}
    const count = Object.keys(extractedBiomarkers).length
    return {
      extractionStatus: text ? 'scanned' : 'scan-failed',
      extractedTextPreview: text.slice(0, 800),
      extractedBiomarkers,
      scanMessage: text
        ? `Scanned document and found ${count} biomarker ${count === 1 ? 'value' : 'values'} for review.`
        : 'No readable lab text was found in this document.',
    }
  }

  if (isDocx) {
    const text = extractTextFromDocx(buffer)
    const extractedBiomarkers = text ? extractBiomarkers(text) : {}
    const count = Object.keys(extractedBiomarkers).length
    return {
      extractionStatus: text ? 'scanned' : 'scan-failed',
      extractedTextPreview: text.slice(0, 800),
      extractedBiomarkers,
      scanMessage: text
        ? `Scanned document and found ${count} biomarker ${count === 1 ? 'value' : 'values'} for review.`
        : 'No readable lab text was found in this document.',
    }
  }

  if (isPdf) {
    // Check if PDF has native digital text
    const embeddedText = await extractTextFromPdf(buffer)
    if (embeddedText) {
      const embeddedBiomarkers = extractBiomarkers(embeddedText)
      if (Object.keys(embeddedBiomarkers).length > 0) {
        const count = Object.keys(embeddedBiomarkers).length
        return {
          extractionStatus: 'scanned',
          extractedTextPreview: embeddedText.slice(0, 800),
          extractedBiomarkers: embeddedBiomarkers,
          scanMessage: `Scanned PDF and found ${count} biomarker ${count === 1 ? 'value' : 'values'} for review.`,
        }
      }
    }

    // Attempt Gemini Vision for scanned PDF
    try {
      const aiResult = await extractBiomarkersWithGeminiVision(mimeType, buffer, options)
      if (aiResult && Object.keys(aiResult.biomarkers).length > 0) {
        const count = Object.keys(aiResult.biomarkers).length
        const preview = aiResult.documentSummary
          ? `${aiResult.documentSummary}\n${formatBiomarkerPreview(aiResult.biomarkers)}`
          : formatBiomarkerPreview(aiResult.biomarkers)
        return {
          extractionStatus: 'ocr-scanned',
          extractedTextPreview: preview.slice(0, 800),
          extractedBiomarkers: aiResult.biomarkers,
          scanMessage: `Scanned PDF with AI Vision and found ${count} biomarker ${count === 1 ? 'value' : 'values'} for review.`,
        }
      }
    } catch {
      // Fallback to local OCR
    }

    // Local fallback with PDF screenshot OCR
    const ocrText = await extractTextWithOcr(buffer)
    const ocrBiomarkers = ocrText ? extractBiomarkers(ocrText) : {}
    const text = embeddedText || ocrText
    const count = Object.keys(ocrBiomarkers).length
    const extractionStatus: LabDocumentScanResult['extractionStatus'] = text
      ? embeddedText
        ? 'scanned'
        : 'ocr-scanned'
      : 'scan-failed'

    return {
      extractionStatus,
      extractedTextPreview: text.slice(0, 800),
      extractedBiomarkers: ocrBiomarkers,
      scanMessage:
        extractionStatus === 'scan-failed'
          ? 'No readable lab text was found in this PDF.'
          : `Scanned PDF and found ${count} biomarker ${count === 1 ? 'value' : 'values'} for review.`,
    }
  }

  if (isImage) {
    // Attempt Gemini Vision first
    try {
      const aiResult = await extractBiomarkersWithGeminiVision(mimeType, buffer, options)
      if (aiResult && Object.keys(aiResult.biomarkers).length > 0) {
        const count = Object.keys(aiResult.biomarkers).length
        const preview = aiResult.documentSummary
          ? `${aiResult.documentSummary}\n${formatBiomarkerPreview(aiResult.biomarkers)}`
          : formatBiomarkerPreview(aiResult.biomarkers)
        return {
          extractionStatus: 'ocr-scanned',
          extractedTextPreview: preview.slice(0, 800),
          extractedBiomarkers: aiResult.biomarkers,
          scanMessage: `Scanned image with AI Vision and found ${count} biomarker ${count === 1 ? 'value' : 'values'} for review.`,
        }
      }
    } catch {
      // Fallback to local OCR
    }

    // Local fallback with Tesseract OCR
    const text = await extractTextFromImage(buffer)
    const extractedBiomarkers = text ? extractBiomarkers(text) : {}
    const count = Object.keys(extractedBiomarkers).length
    const extractionStatus: LabDocumentScanResult['extractionStatus'] = text
      ? 'ocr-scanned'
      : 'scan-failed'

    return {
      extractionStatus,
      extractedTextPreview: text.slice(0, 800),
      extractedBiomarkers,
      scanMessage:
        extractionStatus === 'scan-failed'
          ? 'No readable lab text was found in this image.'
          : `Scanned image and found ${count} biomarker ${count === 1 ? 'value' : 'values'} for review.`,
    }
  }

  throw new Error('unsupported lab document type')
}
