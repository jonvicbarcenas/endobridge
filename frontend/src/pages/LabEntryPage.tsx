import { AlertTriangle, CheckCircle2, ClipboardList, FileText, FlaskConical, Loader2, RotateCcw, Upload, X } from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, InfoTip, Panel, PrimaryButton, SecondaryButton, StatusBadge, fieldControlClass } from '../components/ui'
import { biomarkerGlossary, findGeneralTerm, unitGlossary } from '../config/glossary'
import { usePersistentState } from '../hooks/usePersistentState'
import { BackendApiError } from '../services/backendApiService'
import { formatBytes, prepareLabUpload } from '../services/imageCompression'
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

type UploadPhase = 'idle' | 'preparing' | 'uploading' | 'scanning' | 'saving' | 'done' | 'warning' | 'error'

interface UploadState {
  phase: UploadPhase
  fileName?: string
  progress?: number
  message: string
}

const supportedUploadTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_UPLOAD_BYTES = 6_000_000

function friendlyUploadError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Upload cancelled. Choose the file again when you are ready.'
  }
  if (error instanceof BackendApiError) {
    if (error.status === 0) return 'Connection problem: the file could not reach EndoBridge. Check your internet connection, then tap Retry.'
    if (error.status === 408) return 'The upload took too long. Try again on a stronger connection, or use a smaller photo.'
    if (error.status === 413) return 'This file is too large to scan. Use a PDF or photo under 6 MB.'
    if (error.status === 429) return 'You scanned several files in a short time. Wait about a minute, then tap Retry.'
    if (error.status === 401) return 'Your login session expired. Log in again, then upload the file.'
    if (error.status === 400) return 'This file could not be read as a lab report. Use a clear PDF, photo (JPG, PNG, WEBP), DOCX, or text file.'
    if (error.status === 403) return 'Accept the terms and privacy notice before uploading files.'
  }
  return 'Something went wrong while scanning the file. Tap Retry, or type the values into the form.'
}

const uploadPhaseLabel: Record<UploadPhase, string> = {
  idle: '',
  preparing: 'Preparing file',
  uploading: 'Uploading',
  scanning: 'Reading lab values',
  saving: 'Saving to your account',
  done: 'Scan complete',
  warning: 'Scan finished with a warning',
  error: 'Upload failed',
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
  const { api, token, user } = useAuth()
  const { setDraft } = useSessionDraft()
  // Lab form drafts survive an accidental refresh (kept in this browser tab only).
  const [labDraft, setLabDraft] = usePersistentState(user ? `lab.${user.userId}` : null, {
    age: '',
    weightKg: '',
    heightCm: '',
    biomarkerValues: initialBiomarkers,
    sessionDocumentIds: [] as string[],
  })
  const { age, weightKg, heightCm, biomarkerValues, sessionDocumentIds } = labDraft
  const setAge = (value: string) => setLabDraft((current) => ({ ...current, age: value }))
  const setWeightKg = (value: string) => setLabDraft((current) => ({ ...current, weightKg: value }))
  const setHeightCm = (value: string) => setLabDraft((current) => ({ ...current, heightCm: value }))
  const setBiomarkerValues = (
    update: (current: Record<ActiveBiomarkerKey, string>) => Record<ActiveBiomarkerKey, string>,
  ) => setLabDraft((current) => ({ ...current, biomarkerValues: update(current.biomarkerValues) }))
  const setSessionDocumentIds = (update: (current: string[]) => string[]) =>
    setLabDraft((current) => ({ ...current, sessionDocumentIds: update(current.sessionDocumentIds) }))
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [documents, setDocuments] = useState<LabDocumentRecord[]>([])
  const [upload, setUpload] = useState<UploadState>({ phase: 'idle', message: '' })
  const lastFileRef = useRef<File | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isUploading = ['preparing', 'uploading', 'scanning', 'saving'].includes(upload.phase)
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
    api
      .listRecordData<LabDocumentRecord>(token, 'lab-documents')
      .then(setDocuments)
      .catch(() => setDocuments([]))
  }, [api, token])

  useEffect(() => () => abortRef.current?.abort(), [])

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
    event.target.value = ''
    if (!file) return
    await scanFile(file)
  }

  async function scanFile(originalFile: File) {
    if (!token) return
    lastFileRef.current = originalFile

    if (!supportedUploadTypes.includes(originalFile.type)) {
      setUpload({
        phase: 'error',
        fileName: originalFile.name,
        message: 'This file type is not supported. Upload a PDF, photo (JPG, PNG, WEBP), DOCX, or text file.',
      })
      lastFileRef.current = null
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      setUpload({ phase: 'preparing', fileName: originalFile.name, message: 'Optimizing the file for a faster upload...' })
      const prepared = await prepareLabUpload(originalFile)
      const file = prepared.file
      if (file.size > MAX_UPLOAD_BYTES) {
        setUpload({
          phase: 'error',
          fileName: originalFile.name,
          message: `This file is ${formatBytes(file.size)}. Lab result files must be 6 MB or smaller. Try a PDF or a smaller photo.`,
        })
        lastFileRef.current = null
        return
      }

      const sizeNote = prepared.wasCompressed
        ? `Photo reduced from ${formatBytes(prepared.originalSize)} to ${formatBytes(file.size)} for a faster upload.`
        : `File size ${formatBytes(file.size)}.`
      const dataUrl = await readFileAsDataUrl(file)
      setUpload({ phase: 'uploading', fileName: originalFile.name, progress: 0, message: sizeNote })

      const scan = await api.scanLabDocumentWithProgress<{
        extractionStatus: LabDocumentRecord['extractionStatus']
        extractedTextPreview: string
        extractedBiomarkers: Partial<Record<BiomarkerKey, ExtractedBiomarkerValue>>
        scanMessage: string
      }>(token, dataUrl, {
        signal: controller.signal,
        onUploadProgress: (fraction) =>
          setUpload((current) => ({ ...current, progress: Math.round(fraction * 100) })),
        onUploadComplete: () =>
          setUpload((current) => ({
            ...current,
            phase: 'scanning',
            progress: undefined,
            message: 'Upload finished. Reading the lab values can take up to 30 seconds for photos.',
          })),
      })

      setUpload((current) => ({ ...current, phase: 'saving', message: 'Saving the file to your account...' }))
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
        fileName: originalFile.name,
        extractedBiomarkers: scan.extractedBiomarkers ?? {},
        message: scan.scanMessage,
      })
      const foundCount = Object.keys(scan.extractedBiomarkers ?? {}).length
      const failed = scan.extractionStatus === 'scan-failed' || foundCount === 0
      setUpload({
        phase: failed ? 'warning' : 'done',
        fileName: originalFile.name,
        message: failed
          ? `${scan.scanMessage} The file was saved, but no lab values were found. Try a sharper, well-lit photo, or type the values into the form.`
          : `${scan.scanMessage} Found ${foundCount} of ${allBiomarkers.length} values. Check them against your report before applying.`,
      })
      lastFileRef.current = null
      notifyRecordsChanged()
    } catch (error) {
      setUpload({ phase: 'error', fileName: originalFile.name, message: friendlyUploadError(error) })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  function cancelUpload() {
    abortRef.current?.abort()
  }

  function retryUpload() {
    if (lastFileRef.current) void scanFile(lastFileRef.current)
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
    setUpload((current) => ({
      ...current,
      phase: 'done',
      message: skipped
        ? 'Values with matching units were copied. Values in other units were skipped: type them in after checking your report.'
        : 'Extracted values were copied into the form. Check each one against your report.',
    }))
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
              Enter the ten lab results in your study panel, or upload your report to fill them in. Tap the
              <span className="mx-1 inline-flex align-middle text-indigo-700" aria-hidden="true">ⓘ</span>
              icon next to any test to see what it means. Range flags are for review with your care team.
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
          <Field
            hint={<InfoTip term="BMI">{findGeneralTerm('BMI')?.plain}</InfoTip>}
            label="BMI (auto-calculated)"
          >
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
                hint={
                  <InfoTip term={`${range.label} (${unitGlossary[range.unit]?.term ?? range.unit})`}>
                    {biomarkerGlossary[key].plain}
                    {unitGlossary[range.unit] ? (
                      <span className="mt-2 block text-slate-500">
                        Unit: {unitGlossary[range.unit].plain}
                      </span>
                    ) : null}
                    {needsClinicalReview ? (
                      <span className="mt-2 block text-slate-500">
                        {findGeneralTerm('Clinician review')?.plain}
                      </span>
                    ) : null}
                  </InfoTip>
                }
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
          <label
            aria-disabled={isUploading}
            className={`mt-4 flex min-h-32 flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed px-4 py-5 text-center transition focus-within:ring-4 focus-within:ring-indigo-100 ${
              isUploading
                ? 'cursor-wait border-slate-300 bg-slate-50'
                : 'cursor-pointer border-indigo-300 bg-indigo-50/60 hover:border-indigo-500 hover:bg-indigo-50'
            }`}
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-white text-indigo-700 shadow-sm">
              <Upload size={20} />
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {isUploading ? 'Scanning in progress...' : 'Tap to upload your lab result'}
            </span>
            <span className="text-xs text-slate-600">PDF, JPG, PNG, WEBP, DOCX, or TXT, up to 6 MB. Large photos are shrunk automatically.</span>
            <input
              accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,application/pdf,image/png,image/jpeg,image/webp,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-label="Upload lab result"
              className="sr-only"
              disabled={isUploading}
              onChange={uploadLabResultFile}
              type="file"
            />
          </label>
          {upload.phase !== 'idle' ? (
            <UploadStatus
              onCancel={cancelUpload}
              onRetry={lastFileRef.current ? retryUpload : undefined}
              upload={upload}
            />
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

function UploadStatus({
  upload,
  onCancel,
  onRetry,
}: {
  upload: UploadState
  onCancel: () => void
  onRetry?: () => void
}) {
  const busy = ['preparing', 'uploading', 'scanning', 'saving'].includes(upload.phase)
  const steps: UploadPhase[] = ['preparing', 'uploading', 'scanning', 'saving']
  const activeStep = steps.indexOf(upload.phase)
  const tone =
    upload.phase === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : upload.phase === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : upload.phase === 'done'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-indigo-200 bg-white text-slate-800'
  const Icon = busy ? Loader2 : upload.phase === 'error' || upload.phase === 'warning' ? AlertTriangle : CheckCircle2

  return (
    <div
      aria-live="polite"
      className={`mt-3 rounded-[12px] border p-3 text-sm ${tone}`}
      role={upload.phase === 'error' ? 'alert' : 'status'}
    >
      <div className="flex items-start gap-2">
        <Icon aria-hidden="true" className={`mt-0.5 shrink-0 ${busy ? 'animate-spin text-indigo-600' : ''}`} size={17} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {uploadPhaseLabel[upload.phase]}
            {upload.phase === 'uploading' && upload.progress !== undefined ? ` ${upload.progress}%` : ''}
          </p>
          {upload.fileName ? <p className="truncate text-xs opacity-80">{upload.fileName}</p> : null}
          <p className="mt-1 leading-5">{upload.message}</p>
        </div>
      </div>
      {busy ? (
        <>
          <ol aria-label="Upload steps" className="mt-3 grid grid-cols-4 gap-1">
            {steps.map((step, index) => (
              <li
                className={`h-1.5 rounded-full ${index < activeStep ? 'bg-indigo-600' : index === activeStep ? 'animate-pulse bg-indigo-400' : 'bg-slate-200'}`}
                key={step}
              >
                <span className="sr-only">{uploadPhaseLabel[step]}</span>
              </li>
            ))}
          </ol>
          {upload.phase === 'uploading' && upload.progress !== undefined ? (
            <div
              aria-label="Upload progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={upload.progress}
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
            >
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${upload.progress}%` }} />
            </div>
          ) : null}
          {upload.phase === 'uploading' || upload.phase === 'scanning' ? (
            <SecondaryButton className="mt-3 min-h-9 px-3 text-xs" onClick={onCancel}>
              <X size={14} />
              Cancel
            </SecondaryButton>
          ) : null}
        </>
      ) : null}
      {upload.phase === 'error' && onRetry ? (
        <SecondaryButton className="mt-3 min-h-9 px-3 text-xs" onClick={onRetry}>
          <RotateCcw size={14} />
          Retry
        </SecondaryButton>
      ) : null}
    </div>
  )
}
