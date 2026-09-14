import { describe, expect, it } from 'vitest'
import {
  buildGeminiVisionRequest,
  extractGeminiVisionText,
  parseGeminiVisionResponse,
  scanLabDocument,
} from './labDocumentScanner'

function textDataUrl(text: string) {
  return `data:text/plain;base64,${Buffer.from(text, 'utf8').toString('base64')}`
}

function validPngDataUrl() {
  // Valid 1x1 transparent PNG (67 bytes)
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}

describe('scanLabDocument', () => {
  it('extracts supported biomarkers from plain document uploads', async () => {
    const result = await scanLabDocument(
      textDataUrl('Patient lab result\nLDL cholesterol: 180 mg/dL\nAMH: 9.2 ng/mL'),
    )

    expect(result.extractionStatus).toBe('scanned')
    expect(result.extractedBiomarkers.ldlC).toEqual(
      expect.objectContaining({ key: 'ldlC', value: 180, unit: 'mg/dL' }),
    )
    expect(result.extractedBiomarkers.amh).toEqual(
      expect.objectContaining({ key: 'amh', value: 9.2, unit: 'ng/mL' }),
    )
    expect(result.scanMessage).toContain('document')
  })

  it('restores likely missing decimal points when OCR returns implausible biomarker values', async () => {
    const result = await scanLabDocument(
      textDataUrl('AMH: 72 ng/mL\nLH/FSH ratio: 22 ratio'),
    )

    expect(result.extractedBiomarkers.amh).toEqual(
      expect.objectContaining({ key: 'amh', value: 7.2, confidence: 'medium' }),
    )
    expect(result.extractedBiomarkers.lhFshRatio).toEqual(
      expect.objectContaining({ key: 'lhFshRatio', value: 2.2, confidence: 'medium' }),
    )
  })

  it('rejects MIME spoofing and oversized decoded documents', async () => {
    await expect(
      scanLabDocument(`data:application/pdf;base64,${Buffer.from('not a pdf').toString('base64')}`),
    ).rejects.toThrow(/declared type/i)

    await expect(
      scanLabDocument(`data:text/plain;base64,${Buffer.alloc(6_000_001, 65).toString('base64')}`),
    ).rejects.toThrow(/size limit/i)
  })

  describe('Gemini Vision AI integration', () => {
    it('builds a structured Gemini Vision request with image payload', () => {
      const request = buildGeminiVisionRequest('image/png', 'base64imagedata')
      expect(request.contents[0].parts[0]).toEqual({
        inlineData: {
          mimeType: 'image/png',
          data: 'base64imagedata',
        },
      })
      expect(request.generationConfig.responseMimeType).toBe('application/json')
    })

    it('parses structured Gemini Vision response and normalizes decimal values', () => {
      const rawJson = JSON.stringify({
        documentSummary: 'Labcorp Endocrinology Panel',
        biomarkers: [
          {
            key: 'fastingGlucose',
            value: 92,
            unit: 'mg/dL',
            sourceLabel: 'Glucose, Fasting',
          },
          {
            key: 'amh',
            value: 72, // Should be normalized to 7.2
            unit: 'ng/mL',
            sourceLabel: 'Anti-Mullerian Hormone',
          },
        ],
      })

      const parsed = parseGeminiVisionResponse(rawJson)
      expect(parsed.documentSummary).toBe('Labcorp Endocrinology Panel')
      expect(parsed.biomarkers.fastingGlucose).toEqual(
        expect.objectContaining({
          key: 'fastingGlucose',
          value: 92,
          unit: 'mg/dL',
          confidence: 'high',
        }),
      )
      expect(parsed.biomarkers.amh).toEqual(
        expect.objectContaining({
          key: 'amh',
          value: 7.2,
          confidence: 'medium',
          sourceLabel: 'Anti-Mullerian Hormone (decimal reviewed)',
        }),
      )
    })

    it('extracts candidate text ignoring thought parts and fenced markdown', () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [
                { thought: true, text: 'Thinking about biomarkers...' },
                { text: '```json\n{"documentSummary": "Test", "biomarkers": []}\n```' },
              ],
            },
          },
        ],
      }

      const text = extractGeminiVisionText(response)
      expect(text).toBe('```json\n{"documentSummary": "Test", "biomarkers": []}\n```')
      const parsed = parseGeminiVisionResponse(text)
      expect(parsed.documentSummary).toBe('Test')
      expect(parsed.biomarkers).toEqual({})
    })

    it('uses Gemini Vision to scan lab images when configured', async () => {
      const mockAiPayload = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    documentSummary: 'Comprehensive Metabolic Panel',
                    biomarkers: [
                      {
                        key: 'fastingGlucose',
                        value: 94.5,
                        unit: 'mg/dL',
                        sourceLabel: 'Fasting Blood Sugar',
                      },
                      {
                        key: 'ldlC',
                        value: 110,
                        unit: 'mg/dL',
                        sourceLabel: 'LDL Calculated',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }

      const mockTransport = async () => ({
        ok: true,
        status: 200,
        data: mockAiPayload,
      })

      const result = await scanLabDocument(validPngDataUrl(), {
        apiKey: 'fake-test-key',
        transport: mockTransport,
      })

      expect(result.extractionStatus).toBe('ocr-scanned')
      expect(result.scanMessage).toContain('with AI Vision')
      expect(result.scanMessage).toContain('2 biomarker values')
      expect(result.extractedTextPreview).toContain('Comprehensive Metabolic Panel')
      expect(result.extractedBiomarkers.fastingGlucose).toEqual(
        expect.objectContaining({
          key: 'fastingGlucose',
          value: 94.5,
          unit: 'mg/dL',
        }),
      )
      expect(result.extractedBiomarkers.ldlC).toEqual(
        expect.objectContaining({
          key: 'ldlC',
          value: 110,
          unit: 'mg/dL',
        }),
      )
    })

    it('uses Gemini Vision to scan PDF documents without embedded text', async () => {
      const minimalPdfBase64 = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF',
      ).toString('base64')
      const pdfDataUrl = `data:application/pdf;base64,${minimalPdfBase64}`

      const mockAiPayload = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    documentSummary: 'Scanned Quest Diagnostics PDF',
                    biomarkers: [
                      {
                        key: 'amh',
                        value: 4.5,
                        unit: 'ng/mL',
                        sourceLabel: 'Anti-Mullerian Hormone',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }

      const mockTransport = async () => ({
        ok: true,
        status: 200,
        data: mockAiPayload,
      })

      const result = await scanLabDocument(pdfDataUrl, {
        apiKey: 'fake-test-key',
        transport: mockTransport,
      })

      expect(result.extractionStatus).toBe('ocr-scanned')
      expect(result.scanMessage).toContain('Scanned PDF with AI Vision')
      expect(result.scanMessage).toContain('1 biomarker value')
      expect(result.extractedTextPreview).toContain('Scanned Quest Diagnostics PDF')
      expect(result.extractedBiomarkers.amh).toEqual(
        expect.objectContaining({
          key: 'amh',
          value: 4.5,
          unit: 'ng/mL',
        }),
      )
    })

    it('gracefully falls back to local OCR pipeline when Gemini Vision transport fails', async () => {
      const failingTransport = async () => ({
        ok: false,
        status: 503,
        data: { error: 'service unavailable' },
      })

      // Should not throw; falls back to local Tesseract OCR (which finds no biomarkers on the dummy 8-byte PNG)
      const result = await scanLabDocument(validPngDataUrl(), {
        apiKey: 'fake-test-key',
        transport: failingTransport,
      })

      expect(result.extractionStatus).toBe('scan-failed')
      expect(result.scanMessage).toContain('No readable lab text was found in this image.')
    })
  })
})
