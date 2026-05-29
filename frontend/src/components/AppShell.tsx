import {
  BarChart3,
  CalendarDays,
  FlaskConical,
  Info,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Pill,
  ShieldCheck,
  X,
  HeartPulse,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth'

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview and next actions',
  },
  {
    to: '/lab',
    label: 'Lab Results',
    icon: FlaskConical,
    description: 'Fixed PCOS biomarker panel',
  },
  {
    to: '/daily',
    label: 'Daily Logs',
    icon: CalendarDays,
    description: 'Wellness and cycle notes',
  },
  {
    to: '/symptoms',
    label: 'Symptoms',
    icon: ListChecks,
    description: 'Session-linked tracking',
  },
  {
    to: '/medications',
    label: 'Medication Reminders',
    icon: Pill,
    description: 'User-entered schedules',
  },
  {
    to: '/history',
    label: 'History & Reports',
    icon: BarChart3,
    description: 'Sessions and insights',
  },
]

const pageMeta: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Your Health Dashboard',
    description: 'Track PCOS monitoring data without diagnosis, prescriptions, or medical advice.',
  },
  '/lab': {
    title: 'Lab Result Entry',
    description: 'Enter fixed biomarker values, attach optional lab result files, and continue to context questions.',
  },
  '/daily': {
    title: 'Daily Wellness Log',
    description: 'Record optional daily notes for pattern review across food, sleep, mood, symptoms, and cycle events.',
  },
  '/questionnaire': {
    title: 'Contextual Questionnaire',
    description: 'Answer deterministic follow-up questions generated from flagged biomarker values.',
  },
  '/symptoms': {
    title: 'Symptoms & Tracking',
    description: 'Track PCOS-related symptoms against completed monitoring sessions.',
  },
  '/medications': {
    title: 'Medication Reminders',
    description: 'Store reminders for medications already prescribed by a clinician.',
  },
  '/history': {
    title: 'History & Reports',
    description: 'Review account-backed lab sessions, daily logs, uploaded lab result files, and observational reports.',
  },
  '/about': {
    title: 'About EndoBridge',
    description: 'Scope, safety boundaries, and capstone system purpose.',
  },
}

export function AppShell() {
  const { logout, user } = useAuth()
  const { pathname } = useLocation()
  const [isMobileNavOpen, setMobileNavOpen] = useState(false)
  const meta = pathname.startsWith('/history/')
    ? {
        title: 'Session Detail',
        description: 'Review one monitoring session and generate a bounded observational report.',
      }
    : (pageMeta[pathname] ?? pageMeta['/dashboard'])

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <BrandBlock />
          <SidebarNav />
          <AccountBlock email={user?.email} onLogout={logout} />
        </aside>

        {isMobileNavOpen ? (
          <div className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden">
            <aside className="flex h-full w-[min(88vw,320px)] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pr-3">
                <BrandBlock compact />
                <button
                  aria-label="Close navigation"
                  className="flex size-11 items-center justify-center rounded-[10px] text-slate-600 hover:bg-slate-100"
                  onClick={() => setMobileNavOpen(false)}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
              <AccountBlock email={user?.email} onLogout={logout} />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 lg:pl-[280px]">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4">
              <button
                aria-label="Open navigation"
                className="flex size-11 items-center justify-center rounded-[10px] border border-slate-200 text-slate-700"
                onClick={() => setMobileNavOpen(true)}
                type="button"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">EndoBridge</p>
                <p className="truncate text-xs text-slate-500">{meta.title}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {(user?.email ?? 'U').slice(0, 1).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <section className="rounded-[18px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/60 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    <ShieldCheck size={14} />
                    Non-diagnostic monitoring companion
                  </div>
                  <h1 className="text-2xl font-semibold leading-8 text-slate-950 sm:text-3xl">
                    {meta.title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                    {meta.description}
                  </p>
                </div>
                <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Signed in</p>
                  <p className="mt-1 max-w-[280px] truncate">{user?.email}</p>
                </div>
              </div>
            </section>

            <Outlet />
          </div>
        </div>
      </div>
    </main>
  )
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? 'h-16 px-4' : 'h-20 px-6'}`}>
      <div className="flex size-10 items-center justify-center rounded-[14px] bg-indigo-600 text-white shadow-sm">
        <HeartPulse size={22} />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-950">EndoBridge</p>
        <p className="text-xs text-slate-500">PCOS monitoring</p>
      </div>
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="sidebar-scroll flex flex-1 flex-col gap-7 overflow-y-auto px-3 pb-4" aria-label="Primary navigation">
      <NavSection label="Main">
        {navItems.map(({ to, label, icon: Icon, description }) => (
          <SidebarLink
            description={description}
            icon={Icon}
            key={to}
            label={label}
            onNavigate={onNavigate}
            to={to}
          />
        ))}
      </NavSection>
      <NavSection label="Reference">
        <SidebarLink
          description="System boundaries"
          icon={Info}
          label="About"
          onNavigate={onNavigate}
          to="/about"
        />
      </NavSection>
    </nav>
  )
}

function AccountBlock({
  email,
  onLogout,
}: {
  email?: string
  onLogout: () => void
}) {
  return (
    <div className="border-t border-slate-200 p-4">
      <div className="flex min-w-0 items-center gap-3 rounded-[14px] bg-slate-50 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
          {(email ?? 'U').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{email}</p>
          <p className="text-xs text-slate-500">EndoBridge account</p>
        </div>
      </div>
      <button
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
        onClick={onLogout}
        type="button"
      >
        <LogOut size={16} />
        Log out
      </button>
    </div>
  )
}

function NavSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      {children}
    </div>
  )
}

function SidebarLink({
  description,
  icon: Icon,
  label,
  onNavigate,
  to,
}: {
  description: string
  icon: typeof FlaskConical
  label: string
  onNavigate?: () => void
  to: string
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        `group flex min-h-[56px] items-center gap-3 rounded-[14px] px-3 py-2 text-sm transition ${
          isActive ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'
        }`
      }
      onClick={onNavigate}
      to={to}
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-[12px] ${
              isActive ? 'bg-white text-indigo-700 shadow-sm' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Icon size={18} />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">{label}</span>
            <span className="block truncate text-xs text-slate-500">{description}</span>
          </span>
        </>
      )}
    </NavLink>
  )
}
