import { ClipboardList, FlaskConical } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Panel, PrimaryButton, StatusBadge } from '../components/ui'
import { mandatoryBiomarkers, referenceRanges } from '../config/referenceRanges'
import { validateLabSessionInput } from '../engines/validationEngine'
import { useSessionDraft } from '../context/sessionDraft'
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
  bmi,
  cycleRegularity,
  biomarkerValues,
}: {
  age: string
  bmi: string
  cycleRegularity: string
  biomarkerValues: Record<BiomarkerKey, string>
}): LabSessionInput {
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
    bmi: bmi.trim() ? Number(bmi) : undefined,
    cycleRegularity,
    biomarkers,
  }
}

function rangeLabel(direction?: string) {
  if (direction === 'low') return 'below expected range'
  if (direction === 'high') return 'above expected range'
  if (direction === 'normal') return 'within expected range'
  return 'pending'
}

export function LabEntryPage() {
  const navigate = useNavigate()
  const { setDraft } = useSessionDraft()
  const [age, setAge] = useState('28')
  const [bmi, setBmi] = useState('26')
  const [cycleRegularity, setCycleRegularity] = useState('irregular')
  const [biomarkerValues, setBiomarkerValues] = useState(initialBiomarkers)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const input = buildInput({ age, bmi, cycleRegularity, biomarkerValues })
  const validation = validateLabSessionInput(input)

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

  return (
    <form className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]" onSubmit={submitLabEntry}>
      <Panel title="Lab result entry">
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
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              min={18}
              onChange={(event) => setAge(event.target.value)}
              type="number"
              value={age}
            />
          </Field>
          <Field label="BMI">
            <input
              aria-label="BMI"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setBmi(event.target.value)}
              type="number"
              value={bmi}
            />
          </Field>
          <Field label="Cycle regularity">
            <select
              aria-label="Cycle regularity"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
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
            const error = fieldError(key)
            const isFlagged = Boolean(entry?.isFlagged)

            return (
              <Field error={error} key={key} label={`${range.label} (${range.unit})`}>
                <div className="flex gap-2">
                  <input
                    aria-label={range.label}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2"
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
    </form>
  )
}
