import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  HeartPulse,
  ListChecks,
  Pill,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface TourStep {
  title: string
  body: string
  where: string
  icon: LucideIcon
  to?: string
}

const steps: TourStep[] = [
  {
    title: 'Welcome to EndoBridge',
    body: 'EndoBridge helps you keep PCOS-related lab results, symptoms, daily notes, and medication reminders in one place. It does not diagnose PCOS or give medical advice.',
    where: 'This quick tour takes about a minute. You can reopen it any time from "Take the tour" in the menu.',
    icon: HeartPulse,
  },
  {
    title: '1. Start a lab session',
    body: 'Go to Lab Results. Enter your age, weight, height, and the ten lab values, or tap "Upload lab result" to scan a PDF or photo of your report and fill them in.',
    where: 'Menu → Lab Results. Tap the ⓘ icon next to any test to see what it means.',
    icon: FlaskConical,
    to: '/lab',
  },
  {
    title: '2. Answer the questionnaire',
    body: 'After the lab values, "Continue to questionnaire" asks about your cycle, skin and hair, and daily context. Questions are chosen based on your results.',
    where: 'It opens automatically after the lab step. Saving it creates your session.',
    icon: ListChecks,
  },
  {
    title: '3. Log your day (optional)',
    body: 'Daily Logs record sleep, mood, stress, cycle events, and symptoms. Your last 7 days show up as a weekly summary on the Dashboard.',
    where: 'Menu → Daily Logs. Use the tabs at the top of the form to switch sections.',
    icon: CalendarDays,
    to: '/daily',
  },
  {
    title: '4. Set medication reminders',
    body: 'Add reminders for medicines your clinician already prescribed. Choose the form (tablet, syrup, injection...) and dose unit, then turn on browser alerts.',
    where: 'Menu → Medication Reminders. A 7-day calendar shows what is coming up.',
    icon: Pill,
    to: '/medications',
  },
  {
    title: '5. Review sessions and reports',
    body: 'History & Reports lists every saved lab session. Open one to see flagged values and generate a plain-language observational report.',
    where: 'Menu → History & Reports.',
    icon: BarChart3,
    to: '/history',
  },
  {
    title: 'Not sure what a word means?',
    body: 'The Glossary explains lab tests, units, and symptom terms like hirsutism in plain language.',
    where: 'Menu → Glossary, or tap any ⓘ icon.',
    icon: BookOpen,
    to: '/glossary',
  },
]

export function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDivElement>(null)
  const step = steps[index]
  const Icon = step.icon
  const isLast = index === steps.length - 1

  useEffect(() => {
    dialogRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(current + 1, steps.length - 1))
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(current - 1, 0))
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center">
      <div
        aria-labelledby="tour-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-[20px] bg-white p-5 shadow-2xl outline-none sm:p-6"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-12 items-center justify-center rounded-[14px] bg-indigo-600 text-white">
            <Icon size={24} />
          </span>
          <button
            aria-label="Close tour"
            className="flex size-10 items-center justify-center rounded-[10px] text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-950" id="tour-title">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{step.body}</p>
        <p className="mt-3 rounded-[12px] bg-indigo-50 px-3 py-2 text-sm leading-6 text-indigo-900">{step.where}</p>

        <div aria-hidden="true" className="mt-5 flex justify-center gap-1.5">
          {steps.map((entry, dotIndex) => (
            <span
              className={`h-2 rounded-full transition-all ${dotIndex === index ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200'}`}
              key={entry.title}
            />
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          Step {index + 1} of {steps.length}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            className="inline-flex min-h-11 items-center gap-1 rounded-[10px] px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:invisible"
            disabled={index === 0}
            onClick={() => setIndex((current) => current - 1)}
            type="button"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            {step.to ? (
              <button
                className="inline-flex min-h-11 items-center rounded-[10px] border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  onClose()
                  navigate(step.to!)
                }}
                type="button"
              >
                Open this page
              </button>
            ) : null}
            <button
              className="inline-flex min-h-11 items-center gap-1 rounded-[10px] bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => (isLast ? onClose() : setIndex((current) => current + 1))}
              type="button"
            >
              {isLast ? 'Finish' : 'Next'}
              {isLast ? null : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
