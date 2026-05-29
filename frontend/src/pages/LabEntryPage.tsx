import { ClipboardList, FileText, FlaskConical, Upload } from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Panel, PrimaryButton, StatusBadge, fieldControlClass } from '../components/ui'
import { mandatoryBiomarkers, referenceRanges } from '../config/referenceRanges'
import { calculateBmi } from '../engines/measurementEngine'
import { validateLabSessionInput } from '../engines/validationEngine'
import { notifyRecordsChanged } from '../context/records'
import { useAuth } from '../context/auth'
import { useSessionDraft } from '../context/sessionDraft'
import type { ExtractedBiomarkerValue, LabDocumentRecord } from '../types/monitoring'
import type { BiomarkerInputMap, BiomarkerKey, LabSessionInput } from '../types/session'

const initialBiomarkers: Record<BiomarkerKey, string> = {
  ldlC: '130',
  fastingGlucose: '96',
  fastingInsulin: '15',
  totalTestosterone: '54',
  amh: '7.2',
  lhFshRatio: '2.2',
  dheas: '250',
}

function buildInput({
  age,
  heightCm,
  labDocumentIds,
  weightKg,
  cycleRegularity,
  biomarkerValues,
}: {
  age: string
  heightCm: string
  labDocumentIds: string[]
  weightKg: string
  cycleRegularity: string
  biomarkerValues: Record<BiomarkerKey, string>
}): LabSessionInput {
  const calculatedBmi = calculateBmi({
    weightKg: Number(weightKg),
    heightCm: Number(heightCm),
  })
  const biomarkers = Object.fromEntries(
    mandatoryBiomarkers.map((key) => [
      key,
      {
        value: Number(biomarkerValues[key]),
        unit: referenceRanges[key].unit,
      },
    ]),
  ) as BiomarkerInputMap

  return {
    age: Number(age),
    bmi: calculatedBmi ?? undefined,
    weightKg: weightKg.trim() ? Number(weightKg) : undefined,
    heightCm: heightCm.trim() ? Number(heightCm) : undefined,
    labDocumentIds,
    cycleRegularity,
    biomarkers,
  }
}

function rangeLabel(direction?: string) {
  if (direction === 'low') return 'below expected range'
  if (direction === 'high') return 'above expected range'
  if (direction === 'normal') return 'within expected range'
  return 'review value'
}

function createDocumentId() {
  return globalThis.crypto?.randomUUID
    ? `doc-${globalThis.crypto.randomUUID()}`
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function LabEntryPage() {
  const navigate = useNavigate()
  const { api, token } = useAuth()
  const { setDraft } = useSessionDraft()
  const [age, setAge] = useState('28')
  const [weightKg, setWeightKg] = useState('68')
  const [heightCm, setHeightCm] = useState('160')
  const [cycleRegularity, setCycleRegularity] = useState('irregular')
  const [biomarkerValues, setBiomarkerValues] = useState(initialBiomarkers)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [documents, setDocuments] = useState<LabDocumentRecord[]>([])
  const [sessionDocumentIds, setSessionDocumentIds] = useState<string[]>([])
  const [uploadMessage, setUploadMessage] = useState('')
  const [latestScan, setLatestScan] = useState<{
    fileName: string
    extractedBiomarkers: Partial<Record<BiomarkerKey, ExtractedBiomarkerValue>>
    message: string
  } | null>(null)

  const input = buildInput({
    age,
    weightKg,
    heightCm,
    labDocumentIds: sessionDocumentIds,
    cycleRegularity,
    biomarkerValues,
  })
  const validation = validateLabSessionInput(input)

  useEffect(() => {
    if (!token) return
    api.listRecordData<LabDocumentRecord>(token, 'lab-documents').then(setDocuments)
  }, [api, token])

  function fieldError(key: BiomarkerKey) {
    if (!submitAttempted) return undefined

    const raw = validation.errors.find((error) => error.startsWith(key))
    return raw?.replace(key, referenceRanges[key].label)
  }

  function submitLabEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitAttempted(true)

    if (!validation.isValid) return

    setDraft({ input, validation })
    navigate('/questionnaire')
  }

  async function uploadLabResultFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !token) return

    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]
    if (!supportedTypes.includes(file.type)) {
      setUploadMessage('Upload a PDF, image, DOCX, DOC, or text lab result file.')
      return
    }

    setUploadMessage('Scanning lab result file for biomarker values...')
    const dataUrl = await readFileAsDataUrl(file)
    const scan = await api.scanLabDocument<{
      extractionStatus: LabDocumentRecord['extractionStatus']
      extractedTextPreview: string
      extractedBiomarkers: Partial<Record<BiomarkerKey, ExtractedBiomarkerValue>>
      scanMessage: string
    }>(token, dataUrl)

    const record: LabDocumentRecord = {
      documentId: createDocumentId(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      dataUrl,
      extractionStatus: scan.extractionStatus,
      extractedTextPreview: scan.extractedTextPreview,
      extractedBiomarkers: scan.extractedBiomarkers,
      scanMessage: scan.scanMessage,
    }

    await api.createRecord<LabDocumentRecord>(token, 'lab-documents', record)
    setDocuments((current) => [record, ...current])
    setSessionDocumentIds((current) => [record.documentId, ...current])
    setLatestScan({
      fileName: file.name,
      extractedBiomarkers: scan.extractedBiomarkers,
      message: scan.scanMessage,
    })
    setUploadMessage(`${scan.scanMessage} Review extracted values before using them.`)
    notifyRecordsChanged()
    event.target.value = ''
  }

  function applyExtractedBiomarkers() {
    if (!latestScan) return
    setBiomarkerValues((current) => {
      const next = { ...current }
      Object.entries(latestScan.extractedBiomarkers).forEach(([key, entry]) => {
        if (entry) {
          next[key as BiomarkerKey] = String(entry.value)
        }
      })
      return next
    })
    setUploadMessage('Extracted biomarker values were copied into the form for review.')
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]" onSubmit={submitLabEntry}>
      <Panel eyebrow="Module 1" title="Lab result entry">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-1 text-emerald-700" size={22} />
          <div>
            <p className="text-sm leading-6 text-slate-600">
              Enter the fixed EndoBridge biomarker panel from a lab result. Plausibility errors
              block progression; clinical range flags are kept as monitoring context.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Field
            error={
              submitAttempted && validation.errors.includes('age must be at least 18')
                ? 'Age must be at least 18.'
                : undefined
            }
            label="Age"
          >
            <input
              aria-label="Age"
              className={fieldControlClass}
              min={18}
              onChange={(event) => setAge(event.target.value)}
              type="number"
              value={age}
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              aria-label="Weight in kilograms"
              className={fieldControlClass}
              min={20}
              onChange={(event) => setWeightKg(event.target.value)}
              step="0.1"
              type="number"
              value={weightKg}
            />
          </Field>
          <Field label="Height (cm)">
            <input
              aria-label="Height in centimeters"
              className={fieldControlClass}
              min={100}
              onChange={(event) => setHeightCm(event.target.value)}
              step="0.1"
              type="number"
              value={heightCm}
            />
          </Field>
          <Field label="BMI (auto-calculated)">
            <input
              aria-label="BMI auto-calculated"
              className={`${fieldControlClass} bg-slate-50 text-slate-600`}
              readOnly
              value={input.bmi ? String(input.bmi) : 'Enter kg and cm'}
            />
          </Field>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-1">
          <Field label="Cycle regularity">
            <select
              aria-label="Cycle regularity"
              className={fieldControlClass}
              onChange={(event) => setCycleRegularity(event.target.value)}
              value={cycleRegularity}
            >
              <option value="regular">Regular</option>
              <option value="irregular">Irregular</option>
              <option value="missed">Missed</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {mandatoryBiomarkers.map((key) => {
            const range = referenceRanges[key]
            const entry = validation.validatedBiomarkers[key]
            const plausibilityError = validation.errors.includes(`${key} is outside plausibility bounds`)
            const error = fieldError(key) ?? (plausibilityError ? `${range.label} needs review.` : undefined)
            const isFlagged = Boolean(entry?.isFlagged)

            return (
              <Field error={error} key={key} label={`${range.label} (${range.unit})`}>
                <div className="flex gap-2">
                  <input
                    aria-label={range.label}
                    className={fieldControlClass}
                    onChange={(event) =>
                      setBiomarkerValues((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    type="number"
                    value={biomarkerValues[key]}
                  />
                  <StatusBadge tone={error ? 'danger' : isFlagged ? 'warning' : 'success'}>
                    {rangeLabel(entry?.direction)}
                  </StatusBadge>
                </div>
              </Field>
            )
          })}
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
          <PrimaryButton type="submit">
            <ClipboardList size={18} />
            Continue to questionnaire
          </PrimaryButton>
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel eyebrow="Personal records" title="Lab result upload">
          <div className="flex items-start gap-3">
            <FileText className="mt-1 text-indigo-700" size={20} />
            <p className="text-sm leading-6 text-slate-600">
              Upload a PDF, lab result photo, DOCX, DOC, or text file to scan for supported
              biomarker values. Review extracted values before saving them to a lab session.
            </p>
          </div>
          <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-within:ring-4 focus-within:ring-slate-200">
            <Upload size={17} />
            Upload lab result
            <input
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,application/pdf,image/png,image/jpeg,image/webp,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={uploadLabResultFile}
              type="file"
            />
          </label>
          {uploadMessage ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">{uploadMessage}</p>
          ) : null}
          {latestScan && Object.keys(latestScan.extractedBiomarkers).length > 0 ? (
            <div className="mt-4 rounded-[12px] border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-950">
                Extracted from {latestScan.fileName}
              </p>
              <dl className="mt-3 grid gap-2 text-sm">
                {Object.values(latestScan.extractedBiomarkers).map((entry) =>
                  entry ? (
                    <div className="flex justify-between gap-3" key={entry.key}>
                      <dt className="text-emerald-900">{referenceRanges[entry.key].label}</dt>
                      <dd className="font-medium text-emerald-950">
                        {entry.value} {entry.unit}
                      </dd>
                    </div>
                  ) : null,
                )}
              </dl>
              <PrimaryButton className="mt-3" onClick={applyExtractedBiomarkers} type="button">
                Apply extracted values
              </PrimaryButton>
            </div>
          ) : null}
          {documents.length > 0 ? (
            <div className="mt-4 space-y-2">
              {documents.slice(0, 4).map((document) => (
                <div className="rounded-[12px] bg-slate-50 p-3 text-sm" key={document.documentId}>
                  <p className="font-medium text-slate-900">{document.fileName}</p>
                  <p className="text-slate-600">
                    {document.scanMessage ?? 'Available for personal reference.'} Uploaded{' '}
                    {new Date(document.uploadedAt).toLocaleString()}.
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel title="Current validation summary">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Warning flags</p>
              {validation.flags.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {validation.flags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No out-of-range biomarkers.</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Blocking errors</p>
              {submitAttempted && validation.errors.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm text-rose-700">
                  {validation.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  Errors will appear here after a blocked submit attempt.
                </p>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </form>
  )
}
