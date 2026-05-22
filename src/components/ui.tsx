import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
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
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : null}
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
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400 ${className}`}
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
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`}
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
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  )
}
