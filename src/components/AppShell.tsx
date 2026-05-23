import {
  Activity,
  ClipboardList,
  Database,
  FlaskConical,
  History,
  ListChecks,
  ShieldCheck,
} from 'lucide-react'
import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LocalStorageService } from '../services/localStorageService'

const navItems = [
  { to: '/lab', label: 'Lab Entry', icon: FlaskConical },
  { to: '/symptoms', label: 'Symptoms', icon: ListChecks },
  { to: '/history', label: 'History', icon: History },
]

export function AppShell() {
  const storage = useMemo(() => new LocalStorageService(), [])
  const sessions = storage.getAllSessions()
  const symptoms = storage.getAllSymptoms()
  const medications = storage.getMedications()

  return (
    <main className="min-h-screen bg-[#f7faf8]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
              EndoBridge
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">
              PCOS monitoring workspace
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Local-first monitoring flow for validated lab entry, contextual questionnaire
              capture, local history, and future bounded Gemini reporting.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Primary navigation">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                className={({ isActive }) =>
                  `inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium ${
                    isActive
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`
                }
                key={to}
                to={to}
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric icon={Database} label="Stored sessions" value={sessions.length.toString()} />
          <Metric icon={ShieldCheck} label="Storage mode" value="Local only" />
          <Metric icon={Activity} label="Symptom entries" value={symptoms.length.toString()} />
          <Metric icon={ClipboardList} label="Medications" value={medications.length.toString()} />
        </section>

        <Outlet />
      </div>
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={18} />
        <span className="text-xs font-medium uppercase tracking-normal">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}
