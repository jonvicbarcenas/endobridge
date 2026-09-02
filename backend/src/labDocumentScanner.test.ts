import { describe, expect, it } from 'vitest'
import { scanLabDocument } from './labDocumentScanner'

function textDataUrl(text: string) {
  return `data:text/plain;base64,${Buffer.from(text, 'utf8').toString('base64')}`
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
})
