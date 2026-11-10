import {
  ArrowUp,
  BarChart3,
  BookOpen,
  CalendarDays,
  Compass,
  KeyRound,
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
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { RecoveryCodeCard } from './Gates'
import { OnboardingTour } from './OnboardingTour'
import { hasSeenTour, markTourSeen } from './tourStorage'
import { ReminderWatcher } from './ReminderWatcher'

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
    description: 'Lipid, glucose, and other lab results',
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
    description: 'Record lab results, attach optional files, and continue to cycle and symptom questions.',
  },
  '/daily': {
    title: 'Daily Wellness Log',
    description: 'Record optional daily notes for pattern review across food, sleep, mood, symptoms, and cycle events.',
  },
  '/questionnaire': {
    title: 'Contextual Questionnaire',
    description: 'Record cycle timing and relevant symptoms with questions based on the submitted results.',
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
    description: 'What the app offers, its limitations, and how your information is protected.',
  },
  '/glossary': {
    title: 'Glossary',
    description: 'Plain-language meanings of lab tests, units, and symptom terms.',
  },
}

export function AppShell() {
  const { logout, user, regenerateRecoveryCode } = useAuth()
  const { pathname } = useLocation()
  const [isMobileNavOpen, setMobileNavOpen] = useState(false)
  const [isTourOpen, setTourOpen] = useState(() => Boolean(user && !hasSeenTour(user.userId)))
  const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  const closeTour = useCallback(() => {
    if (user) markTourSeen(user.userId)
    setTourOpen(false)
  }, [user])

  const openTour = useCallback(() => {
    setMobileNavOpen(false)
    setTourOpen(true)
  }, [])

  const createRecoveryCode = useCallback(async () => {
    const confirmed = window.confirm(
      'Create a new recovery code? Your previous code will stop working.',
    )
    if (!confirmed) return
    try {
      setMobileNavOpen(false)
      setNewRecoveryCode(await regenerateRecoveryCode())
    } catch {
      window.alert('Could not create a recovery code. Check your connection and try again.')
    }
  }, [regenerateRecoveryCode])

  // Start each page at the top, so phone users do not land mid-page.
  useEffect(() => {
    window.scrollTo?.({ top: 0 })
  }, [pathname])

  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const backgroundContentRef = useRef<HTMLDivElement>(null)
  const mobileNavRef = useRef<HTMLElement>(null)
  const openNavButtonRef = useRef<HTMLButtonElement>(null)
  const closeNavButtonRef = useRef<HTMLButtonElement>(null)
  const meta = pathname.startsWith('/history/')
    ? {
        title: 'Session Detail',
        description: 'Review one monitoring session and generate a bounded observational report.',
      }
    : (pageMeta[pathname] ?? pageMeta['/dashboard'])

  useEffect(() => {
    document.title = `${meta.title} | EndoBridge`
  }, [meta.title])

  useEffect(() => {
    if (!isMobileNavOpen) return

    const previousOverflow = document.body.style.overflow
    const backgroundContent = backgroundContentRef.current
    const openNavButton = openNavButtonRef.current
    document.body.style.overflow = 'hidden'
    backgroundContent?.setAttribute('inert', '')
    closeNavButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileNavOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = Array.from(
        mobileNavRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute('hidden'))

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      if (!firstElement || !lastElement) return

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      backgroundContent?.removeAttribute('inert')
      openNavButton?.focus()
    }
  }, [isMobileNavOpen])

  return (
    <main className="min-h-screen bg-[#faf6f8] text-slate-950">
      <div className="min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <BrandBlock />
          <SidebarNav onTakeTour={openTour} />
          <AccountBlock email={user?.email} onLogout={logout} onRecoveryCode={createRecoveryCode} />
        </aside>

        {isMobileNavOpen ? (
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setMobileNavOpen(false)
            }}
          >
            <aside
              aria-label="Mobile navigation"
              aria-modal="true"
              className="flex h-full w-[min(88vw,320px)] flex-col bg-white shadow-xl"
              id="mobile-navigation-dialog"
              ref={mobileNavRef}
              role="dialog"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pr-3">
                <BrandBlock compact />
                <button
                  aria-label="Close navigation"
                  className="flex size-11 items-center justify-center rounded-[10px] text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  onClick={() => setMobileNavOpen(false)}
                  ref={closeNavButtonRef}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} onTakeTour={openTour} />
              <AccountBlock email={user?.email} onLogout={logout} onRecoveryCode={createRecoveryCode} />
            </aside>
          </div>
        ) : null}

        <div
          aria-hidden={isMobileNavOpen || undefined}
          className="min-w-0 lg:pl-[280px]"
          ref={backgroundContentRef}
        >
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4">
              <button
                aria-controls="mobile-navigation-dialog"
                aria-expanded={isMobileNavOpen}
                aria-label="Open navigation"
                className="flex size-11 items-center justify-center rounded-[10px] border border-slate-200 text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                onClick={() => setMobileNavOpen(true)}
                ref={openNavButtonRef}
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
            <section className="rounded-[18px] border border-slate-200 border-t-4 border-t-indigo-500 bg-white px-5 py-4 shadow-sm shadow-slate-200/60 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="mb-3 hidden items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 sm:inline-flex">
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
                <div className="hidden rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:block">
                  <p className="font-medium text-slate-900">Signed in</p>
                  <p className="mt-1 max-w-[280px] truncate">{user?.email}</p>
                </div>
              </div>
            </section>

            <Outlet />
          </div>
        </div>
      </div>

      <ReminderWatcher />

      {showBackToTop ? (
        <button
          aria-label="Back to top"
          className="fixed bottom-4 left-4 z-40 flex size-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-400/40 transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-200 lg:left-[296px]"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          type="button"
        >
          <ArrowUp size={20} />
        </button>
      ) : null}

      {isTourOpen ? <OnboardingTour onClose={closeTour} /> : null}

      {newRecoveryCode ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3">
          <div aria-label="New recovery code" aria-modal="true" className="w-full max-w-lg" role="dialog">
            <RecoveryCodeCard
              code={newRecoveryCode}
              continueLabel="Done"
              intro="Your previous recovery code no longer works. Save this new one; it is shown only once."
              onContinue={() => setNewRecoveryCode(null)}
              title="New recovery code"
            />
          </div>
        </div>
      ) : null}
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

function SidebarNav({ onNavigate, onTakeTour }: { onNavigate?: () => void; onTakeTour: () => void }) {
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
      <NavSection label="Help">
        <button
          className="group flex min-h-[56px] items-center gap-3 rounded-[14px] px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          onClick={onTakeTour}
          type="button"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-slate-100 text-slate-500">
            <Compass size={18} />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Take the tour</span>
            <span className="block truncate text-xs text-slate-500">Where to find everything</span>
          </span>
        </button>
        <SidebarLink
          description="What medical terms mean"
          icon={BookOpen}
          label="Glossary"
          onNavigate={onNavigate}
          to="/glossary"
        />
        <SidebarLink
          description="Features, limits, safety"
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
  onRecoveryCode,
}: {
  email?: string
  onLogout: () => void
  onRecoveryCode: () => void
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
        onClick={onRecoveryCode}
        type="button"
      >
        <KeyRound size={16} />
        New recovery code
      </button>
      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
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
