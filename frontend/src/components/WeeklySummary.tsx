import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DailyLogRecord } from '../types/monitoring'
import { EmptyState, Panel } from './ui'

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

interface WeekDay {
  date: Date
  log: DailyLogRecord | undefined
}

function lastSevenDays(logs: DailyLogRecord[], today = new Date()): WeekDay[] {
  const byDay = new Map<string, DailyLogRecord>()
  logs.forEach((log) => {
    const key = localDateKey(new Date(log.date))
    if (!byDay.has(key)) byDay.set(key, log)
  })
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    return { date, log: byDay.get(localDateKey(date)) }
  })
}

function average(values: number[]) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null
}

function topMood(days: WeekDay[]) {
  const counts = new Map<string, number>()
  days.forEach(({ log }) =>
    log?.mood
      .split(',')
      .map((mood) => mood.trim())
      .filter(Boolean)
      .forEach((mood) => counts.set(mood, (counts.get(mood) ?? 0) + 1)),
  )
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/** Simple bar chart of the last 7 days of daily logs: sleep hours and stress level. */
export function WeeklySummary({ logs }: { logs: DailyLogRecord[] }) {
  const days = lastSevenDays(logs)
  const logged = days.filter((day) => day.log)
  const sleepValues = logged.map((day) => day.log!.sleepHours).filter((value): value is number => value !== null)
  const stressValues = logged.map((day) => day.log!.stressLevel).filter((value): value is number => value !== null)
  const avgSleep = average(sleepValues)
  const avgStress = average(stressValues)
  const mood = topMood(days)

  return (
    <Panel
      action={
        <Link className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline" to="/daily">
          Log today
          <ArrowRight size={15} />
        </Link>
      }
      eyebrow="Last 7 days"
      title="Weekly health summary"
    >
      {logged.length === 0 ? (
        <EmptyState title="No daily logs this week">
          Save a daily log to see your sleep, stress, and mood here. Each day you log adds one column.
        </EmptyState>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Days logged" value={`${logged.length} / 7`} />
            <SummaryStat label="Avg. sleep" value={avgSleep !== null ? `${avgSleep} h` : '—'} />
            <SummaryStat label="Avg. stress" value={avgStress !== null ? `${avgStress} / 10` : '—'} />
            <SummaryStat label="Most logged mood" value={mood ?? '—'} />
          </dl>

          <figure className="mt-5">
            <figcaption className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-indigo-500" /> Sleep (hours, max 12)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-amber-400" /> Stress (1-10)
              </span>
            </figcaption>
            <div className="grid grid-cols-7 gap-2" role="list">
              {days.map(({ date, log }, index) => {
                const sleep = log?.sleepHours ?? null
                const stress = log?.stressLevel ?? null
                const isToday = index === 6
                const dayLabel = isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })
                const description = log
                  ? `${dayLabel}: sleep ${sleep ?? 'not logged'}${sleep !== null ? ' hours' : ''}, stress ${stress ?? 'not logged'}${log.mood ? `, mood ${log.mood}` : ''}`
                  : `${dayLabel}: no log`
                return (
                  <div aria-label={description} className="flex flex-col items-center" key={date.toISOString()} role="listitem">
                    <div
                      className={`flex h-32 w-full items-end justify-center gap-1 rounded-[10px] px-1 pb-1 ${log ? 'bg-slate-50' : 'border border-dashed border-slate-200'}`}
                      title={description}
                    >
                      {log ? (
                        <>
                          <span
                            className="w-1/2 max-w-4 rounded-t bg-indigo-500"
                            style={{ height: `${sleep !== null ? Math.max(4, Math.min(100, (sleep / 12) * 100)) : 0}%` }}
                          />
                          <span
                            className="w-1/2 max-w-4 rounded-t bg-amber-400"
                            style={{ height: `${stress !== null ? Math.max(4, stress * 10) : 0}%` }}
                          />
                        </>
                      ) : null}
                    </div>
                    <span className={`mt-1 text-[11px] font-semibold ${isToday ? 'text-indigo-700' : 'text-slate-500'}`}>
                      {dayLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          </figure>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            A summary of what you logged, not a health assessment. Empty columns are days without a log.
          </p>
        </>
      )}
    </Panel>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 truncate text-lg font-semibold text-slate-950">{value}</dd>
    </div>
  )
}
