import type { ButtonHTMLAttributes, ReactNode } from 'react'

export const fieldControlClass =
  'min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100'

export function Panel({
  title,
  eyebrow,
  children,
  action,
  className = '',
}: {
  title: string
  eyebrow?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-indigo-700">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1 block">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-700">{error}</span> : null}
    </label>
  )
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-400 ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  children: ReactNode
}) {
  const toneClass = {
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
  }[tone]

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
      <p className="font-semibold text-slate-900">{title}</p>
      <div className="mt-1 leading-6 text-slate-600">{children}</div>
    </div>
  )
}

export function StatCard({
  icon,
  label,
  value,
  detail,
  tone = 'indigo',
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  tone?: 'indigo' | 'cyan' | 'emerald' | 'amber'
}) {
  const toneClass = {
    indigo: 'bg-indigo-50 text-indigo-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone]

  return (
    <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex size-9 items-center justify-center rounded-full ${toneClass}`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold leading-9 text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </article>
  )
}
