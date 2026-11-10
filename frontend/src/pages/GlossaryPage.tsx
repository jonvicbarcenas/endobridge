import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Panel, fieldControlClass } from '../components/ui'
import { allGlossaryEntries, type GlossaryEntry } from '../config/glossary'

const categories: GlossaryEntry['category'][] = ['Lab test', 'Symptom', 'General', 'Unit']
const categoryTitle: Record<GlossaryEntry['category'], string> = {
  'Lab test': 'Lab tests',
  Symptom: 'Symptoms',
  General: 'General terms',
  Unit: 'Units of measurement',
}

export function GlossaryPage() {
  const [query, setQuery] = useState('')
  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return allGlossaryEntries().filter(
      (entry) => !needle || entry.term.toLowerCase().includes(needle) || entry.plain.toLowerCase().includes(needle),
    )
  }, [query])

  return (
    <div className="space-y-6">
      <Panel eyebrow="Plain language" title="What do these words mean?">
        <p className="text-sm leading-6 text-slate-600">
          Short explanations of the lab tests, units, and symptom words used in EndoBridge. These
          describe what a term means, not what your own results mean. Ask your clinician about your values.
        </p>
        <label className="relative mt-4 block">
          <span className="sr-only">Search terms</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            className={`${fieldControlClass} pl-9`}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search, for example: hirsutism, HbA1c, mg/dL"
            type="search"
            value={query}
          />
        </label>
      </Panel>

      {categories.map((category) => {
        const items = entries.filter((entry) => entry.category === category)
        if (items.length === 0) return null
        return (
          <Panel key={category} title={categoryTitle[category]}>
            <dl className="grid gap-3 md:grid-cols-2">
              {items.map((entry) => (
                <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4" key={entry.term}>
                  <dt className="font-semibold text-slate-950">{entry.term}</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-700">{entry.plain}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        )
      })}
      {entries.length === 0 ? (
        <p className="text-sm text-slate-600">No terms match “{query}”.</p>
      ) : null}
    </div>
  )
}
