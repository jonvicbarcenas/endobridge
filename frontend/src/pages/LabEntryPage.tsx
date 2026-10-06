import { ClipboardList, FileText, FlaskConical, Upload } from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Panel, PrimaryButton, StatusBadge, fieldControlClass } from '../components/ui'
import { allBiomarkers, assayDependentBiomarkers, referenceRanges, requiredNewBiomarkers } from '../config/referenceRanges'
import { calculateBmi } from '../engines/measurementEngine'
import { validateLabSessionInput } from '../engines/validationEngine'
import { notifyRecordsChanged } from '../context/records'
import { useAuth } from '../context/auth'
import { useSessionDraft } from '../context/sessionDraft'
import type { ExtractedBiomarkerValue, LabDocumentRecord } from '../types/monitoring'
import type { BiomarkerInputMap, BiomarkerKey, LabSessionInput } from '../types/session'

type ActiveBiomarkerKey = (typeof allBiomarkers)[number]

const initialBiomarkers: Record<ActiveBiomarkerKey, string> = {
  totalTestosterone: '',
  triglycerides: '',
  fastingGlucose: '',
  totalCholesterol: '',
  hdlC: '',
  ldlC: '',
  tsh: '',
  freeT3: '',
  freeT4: '',
  hba1c: '',
}

function buildInput({
  age,
  heightCm,
  labDocumentIds,
  weightKg,
  biomarkerValues,
}: {
  age: string
  heightCm: string
  labDocumentIds: string[]
  weightKg: string
  biomarkerValues: Record<ActiveBiomarkerKey, string>
}): LabSessionInput {
  const calculatedBmi = calculateBmi({
    weightKg: Number(weightKg),
    heightCm: Number(heightCm),
  })
  const biomarkers = Object.fromEntries(
    allBiomarkers
      .filter((key) => biomarkerValues[key].trim())
      .map((key) => [
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
    panelVersion: 'fixed-ten',
    biomarkers,
  }
}

function rangeLabel(direction?: string) {
  if (direction === 'low') return 'below expected range'
  if (direction === 'high') return 'above expected range'
  if (direction === 'normal') return 'within expected range'
  return 'review value'
}

function friendlyValidationMessage(message: string) {
  if (message.startsWith('weightKg')) return 'Weight is required for BMI.'
  if (message.startsWith('heightCm')) return 'Height is required for BMI.'
  if (message.startsWith('bmi')) return 'BMI could not be calculated from these measurements.'
  const biomarkerKey = allBiomarkers.find((key) => message.startsWith(key))
  const friendly = biomarkerKey
    ? `${referenceRanges[biomarkerKey].label}${message.slice(biomarkerKey.length)}`
    : `${message.charAt(0).toUpperCase()}${message.slice(1)}`

  return friendly.endsWith('.') ? friendly : `${friendly}.`
}

function validationErrorTargetId(message: string) {
  if (message.startsWith('age')) return 'age'
  if (message.startsWith('weightKg') || message.startsWith('bmi')) return 'weight-kg'
  if (message.startsWith('heightCm')) return 'height-cm'

  const biomarkerKey = allBiomarkers.find((key) => message.startsWith(key))
  return biomarkerKey ? `biomarker-${biomarkerKey}` : undefined
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
  const [age, setAge] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [biomarkerValues, setBiomarkerValues] = useState(initialBiomarkers)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [documents, setDocuments] = useState<LabDocumentRecord[]>([])
  const [sessionDocumentIds, setSessionDocumentIds] = useState<string[]>([])
  const [uploadMessage, setUploadMessage] = useState('')
  const ageInputRef = useRef<HTMLInputElement>(null)
  const weightInputRef = useRef<HTMLInputElement>(null)
  const heightInputRef = useRef<HTMLInputElement>(null)
  const biomarkerInputRefs = useRef<Partial<Record<BiomarkerKey, HTMLInputElement | null>>>({})
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
    return raw ? friendlyValidationMessage(raw) : undefined
  }

  function focusValidationError(message: string) {
    if (message.startsWith('age')) {
      ageInputRef.current?.focus()
      return
    }
    if (message.startsWith('weightKg') || message.startsWith('bmi')) {
      weightInputRef.current?.focus()
      return
    }
    if (message.startsWith('heightCm')) {
      heightInputRef.current?.focus()
      return
    }

    const biomarkerKey = allBiomarkers.find((key) => message.startsWith(key))
    if (biomarkerKey) biomarkerInputRefs.current[biomarkerKey]?.focus()
  }

  function submitLabEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitAttempted(true)

    if (!validation.isValid) {
      const firstError = validation.errors[0]
      queueMicrotask(() => focusValidationError(firstError))
      return
    }

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
    ]
    if (!supportedTypes.includes(file.type)) {
      setUploadMessage('Upload a PDF, image, DOCX, or text lab result file.')
      return
    }
    if (file.size > 6_000_000) {
      setUploadMessage('Lab result files must be 6 MB or smaller.')
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
    const compatibleEntries = Object.entries(latestScan.extractedBiomarkers).filter(([key, entry]) =>
      entry && allBiomarkers.includes(key as ActiveBiomarkerKey) &&
      entry.unit.trim().toLowerCase() === referenceRanges[key as ActiveBiomarkerKey].unit.toLowerCase(),
    )
    const skipped = Object.keys(latestScan.extractedBiomarkers).length - compatibleEntries.length
    setBiomarkerValues((current) => {
      const next = { ...current }
      compatibleEntries.forEach(([key, entry]) => {
        if (entry) {
          next[key as ActiveBiomarkerKey] = String(entry.value)
        }
      })
      return next
    })
    setUploadMessage(skipped
      ? 'Matching-unit values were copied. Review other results with your lab or clinician before entering them.'
      : 'Extracted biomarker values were copied into the form for review.')
  }



  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]"
      noValidate
      onSubmit={submitLabEntry}
    >
      <Panel eyebrow="Module 1" title="Lab result entry">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-1 text-emerald-700" size={22} />
          <div>
          <p className="text-sm leading-6 text-slate-600">
              Enter the ten lab results in your study panel. Clinical range flags are for review with your care team.
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
            errorId="age-error"
            label="Age"
            required
          >
            <input
              aria-describedby={
                submitAttempted && validation.errors.includes('age must be at least 18')
                  ? 'age-error'
                  : undefined
              }
              aria-invalid={
                submitAttempted && validation.errors.includes('age must be at least 18')
              }
              aria-label="Age"
              aria-required="true"
              className={fieldControlClass}
              id="age"
              min={18}
              onChange={(event) => setAge(event.target.value)}
              ref={ageInputRef}
              required
              type="number"
              value={age}
            />
          </Field>
          <Field error={submitAttempted && validation.errors.some((item) => item.startsWith('weightKg')) ? 'Weight is required for BMI.' : undefined} errorId="weight-kg-error" label="Weight (kg)" required>
            <input
              aria-label="Weight in kilograms"
              aria-required="true"
              aria-invalid={submitAttempted && validation.errors.some((item) => item.startsWith('weightKg'))}
              aria-describedby={submitAttempted && validation.errors.some((item) => item.startsWith('weightKg')) ? 'weight-kg-error' : undefined}
              className={fieldControlClass}
              id="weight-kg"
              min={20}
              onChange={(event) => setWeightKg(event.target.value)}
              ref={weightInputRef}
              required
              step="0.1"
              type="number"
              value={weightKg}
            />
          </Field>
          <Field error={submitAttempted && validation.errors.some((item) => item.startsWith('heightCm')) ? 'Height is required for BMI.' : undefined} errorId="height-cm-error" label="Height (cm)" required>
            <input
              aria-label="Height in centimeters"
              aria-required="true"
              aria-invalid={submitAttempted && validation.errors.some((item) => item.startsWith('heightCm'))}
              aria-describedby={submitAttempted && validation.errors.some((item) => item.startsWith('heightCm')) ? 'height-cm-error' : undefined}
              className={fieldControlClass}
              id="height-cm"
              min={100}
              onChange={(event) => setHeightCm(event.target.value)}
              ref={heightInputRef}
              required
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
              placeholder="Auto-calculates from kg and cm"
              value={input.bmi ? String(input.bmi) : ''}
            />
          </Field>
        </div>

        <p className="mt-2 text-xs text-slate-600">
          For Asian adults, BMI 23 kg/m2 is a diabetes screening threshold when other risk factors are present; BMI alone does not diagnose PCOS.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {allBiomarkers.map((key) => {
            const range = referenceRanges[key]
            const entry = validation.validatedBiomarkers[key]
            const plausibilityError = validation.errors.includes(`${key} is outside plausibility bounds`)
            const error = fieldError(key) ?? (plausibilityError ? `${range.label} needs review.` : undefined)
            const isFlagged = Boolean(entry?.isFlagged)
            const hasValue = biomarkerValues[key].trim().length > 0
            const needsClinicalReview = assayDependentBiomarkers.has(key)
            const isRequired = requiredNewBiomarkers.includes(key)

            return (
              <Field
                error={error}
                errorId={`biomarker-${key}-error`}
                key={key}
                label={`${range.label} (${range.unit})`}
                required={isRequired}
              >
                <div className="flex gap-2">
                  <input
                    aria-describedby={error ? `biomarker-${key}-error` : undefined}
                    aria-invalid={Boolean(error)}
                    aria-label={range.label}
                    aria-required={isRequired}
                    className={fieldControlClass}
                    id={`biomarker-${key}`}
                    onChange={(event) =>
                      setBiomarkerValues((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    ref={(element) => {
                      biomarkerInputRefs.current[key] = element
                    }}
                    required={isRequired}
                    step="any"
                    type="number"
                    value={biomarkerValues[key]}
                  />
                  {hasValue ? (
                    <StatusBadge tone={error ? 'danger' : needsClinicalReview ? 'neutral' : isFlagged ? 'warning' : 'success'}>
                      {needsClinicalReview ? 'clinician review' : rangeLabel(entry?.direction)}
                    </StatusBadge>
                  ) : null}
                </div>
              </Field>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Hormone and thyroid results are recorded for clinician review, not automatically classified. Units must match the lab report.
        </p>

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
              Upload a PDF, lab result photo, DOCX, or text file to scan for supported
              biomarker values. Review extracted values before saving them to a lab session.
            </p>
          </div>
          <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-within:ring-4 focus-within:ring-slate-200">
            <Upload size={17} />
            Upload lab result
            <input
              accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,application/pdf,image/png,image/jpeg,image/webp,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                    <li key={flag}>{friendlyValidationMessage(flag)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No out-of-range biomarkers.</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Blocking errors</p>
              {submitAttempted && validation.errors.length > 0 ? (
                <div aria-live="assertive" role="alert">
                  <p className="sr-only">
                    {validation.errors.length} blocking errors found. Focus moved to the first
                    invalid field.
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-rose-700">
                    {validation.errors.map((error) => {
                      const targetId = validationErrorTargetId(error)
                      const message = friendlyValidationMessage(error)

                      return (
                        <li key={error}>
                          {targetId ? (
                            <a
                              className="rounded-sm underline decoration-rose-300 underline-offset-2 focus:outline-none focus:ring-4 focus:ring-rose-100"
                              href={`#${targetId}`}
                              onClick={(event) => {
                                event.preventDefault()
                                focusValidationError(error)
                              }}
                            >
                              {message}
                            </a>
                          ) : (
                            message
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
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
