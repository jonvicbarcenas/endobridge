import type { BiomarkerKey } from '../types/session'

export interface GlossaryEntry {
  term: string
  plain: string
  category: 'Lab test' | 'Unit' | 'Symptom' | 'General'
}

/**
 * Plain-language definitions shown next to lab tests, units, and symptom
 * labels. Wording stays descriptive: it explains what a term means and never
 * tells the user what a value means for them.
 */
export const biomarkerGlossary: Record<BiomarkerKey, GlossaryEntry> = {
  totalTestosterone: {
    term: 'Total testosterone',
    plain: 'A hormone found in everyone. Labs measure it because higher levels can be linked with acne, extra hair growth, and irregular periods.',
    category: 'Lab test',
  },
  triglycerides: {
    term: 'Triglycerides',
    plain: 'A type of fat carried in the blood. Usually measured after not eating for 8 to 12 hours.',
    category: 'Lab test',
  },
  fastingGlucose: {
    term: 'Fasting glucose',
    plain: 'Blood sugar measured after not eating for at least 8 hours.',
    category: 'Lab test',
  },
  totalCholesterol: {
    term: 'Total cholesterol',
    plain: 'The total amount of cholesterol (a waxy fat) in the blood, including HDL and LDL.',
    category: 'Lab test',
  },
  hdlC: {
    term: 'HDL-C',
    plain: 'High-density lipoprotein cholesterol, often called "good" cholesterol because it helps carry cholesterol away from blood vessels.',
    category: 'Lab test',
  },
  ldlC: {
    term: 'LDL-C',
    plain: 'Low-density lipoprotein cholesterol, often called "bad" cholesterol because it can build up in blood vessels.',
    category: 'Lab test',
  },
  tsh: {
    term: 'TSH',
    plain: 'Thyroid-stimulating hormone. A signal from the brain that tells the thyroid gland (in your neck) how hard to work.',
    category: 'Lab test',
  },
  freeT3: {
    term: 'Free T3',
    plain: 'Triiodothyronine, the active thyroid hormone that is free (not attached to proteins) in the blood.',
    category: 'Lab test',
  },
  freeT4: {
    term: 'Free T4',
    plain: 'Thyroxine, the main hormone the thyroid makes, measured while free in the blood. The body turns it into T3.',
    category: 'Lab test',
  },
  hba1c: {
    term: 'HbA1c',
    plain: 'Glycated hemoglobin. Shows your average blood sugar over roughly the past 2 to 3 months, as a percentage.',
    category: 'Lab test',
  },
  fastingInsulin: {
    term: 'Fasting insulin',
    plain: 'Insulin is the hormone that moves sugar from the blood into cells. Measured after not eating for at least 8 hours.',
    category: 'Lab test',
  },
  amh: {
    term: 'AMH',
    plain: 'Anti-Müllerian hormone, made by the ovaries. Often used as a marker of ovarian reserve.',
    category: 'Lab test',
  },
  lhFshRatio: {
    term: 'LH/FSH ratio',
    plain: 'Compares two hormones from the brain (luteinizing hormone and follicle-stimulating hormone) that control the menstrual cycle.',
    category: 'Lab test',
  },
  dheas: {
    term: 'DHEAS',
    plain: 'Dehydroepiandrosterone sulfate, a hormone made mostly by the adrenal glands that the body can turn into testosterone.',
    category: 'Lab test',
  },
  ogttTwoHourGlucose: {
    term: 'OGTT (2-hour glucose)',
    plain: 'Oral glucose tolerance test. Blood sugar measured 2 hours after drinking a 75 g sugar drink.',
    category: 'Lab test',
  },
}

export const unitGlossary: Record<string, GlossaryEntry> = {
  'mg/dL': { term: 'mg/dL', plain: 'Milligrams per deciliter: how many milligrams of a substance are in 100 mL of blood.', category: 'Unit' },
  'ng/dL': { term: 'ng/dL', plain: 'Nanograms per deciliter: a very small amount (one billionth of a gram) per 100 mL of blood.', category: 'Unit' },
  'ng/mL': { term: 'ng/mL', plain: 'Nanograms per milliliter of blood.', category: 'Unit' },
  'pg/mL': { term: 'pg/mL', plain: 'Picograms per milliliter: one trillionth of a gram per mL of blood.', category: 'Unit' },
  'mIU/L': { term: 'mIU/L', plain: 'Milli-international units per liter, a standard unit for hormone activity.', category: 'Unit' },
  'uIU/mL': { term: 'µIU/mL', plain: 'Micro-international units per milliliter, a standard unit for insulin.', category: 'Unit' },
  'ug/dL': { term: 'µg/dL', plain: 'Micrograms per deciliter: one millionth of a gram per 100 mL of blood.', category: 'Unit' },
  '%': { term: '%', plain: 'Percentage. For HbA1c, the share of hemoglobin that has sugar attached.', category: 'Unit' },
  ratio: { term: 'ratio', plain: 'One value divided by another, so it has no unit.', category: 'Unit' },
}

export const generalGlossary: GlossaryEntry[] = [
  { term: 'PCOS', plain: 'Polycystic ovary syndrome, a common hormonal condition that can affect periods, skin, hair, weight, and blood sugar. Only a clinician can diagnose it.', category: 'General' },
  { term: 'BMI', plain: 'Body mass index: weight (kg) divided by height (m) squared. A rough screening number, not a diagnosis.', category: 'General' },
  { term: 'Hirsutism', plain: 'Extra coarse or dark hair growth in places like the face, chest, belly, or back.', category: 'Symptom' },
  { term: 'Acne', plain: 'Pimples, blackheads, or bumps on the skin, often on the face, chest, or back.', category: 'Symptom' },
  { term: 'Hair thinning', plain: 'Hair on the scalp becoming less dense, or more hair falling out than usual.', category: 'Symptom' },
  { term: 'Cycle irregularity', plain: 'Periods that come less often than every 35 days, more often than every 21 days, or at unpredictable times.', category: 'Symptom' },
  { term: 'Spotting', plain: 'Light bleeding between periods that is less than a normal period.', category: 'Symptom' },
  { term: 'Menstrual flow', plain: 'How heavy or light your period bleeding is.', category: 'Symptom' },
  { term: 'Fatigue', plain: 'Feeling tired or low on energy in a way that affects daily activities.', category: 'Symptom' },
  { term: 'Fasting', plain: 'Not eating or drinking anything except water for a set time (usually 8 to 12 hours) before a blood test.', category: 'General' },
  { term: 'Reference range', plain: 'The range of values a lab expects for most healthy people. Being outside it is a reason to review with a clinician, not a diagnosis.', category: 'General' },
  { term: 'Assay', plain: 'The specific lab method used to measure a value. Different labs can use different assays, so ranges can vary.', category: 'General' },
  { term: 'Clinician review', plain: 'This value depends on the lab method, so EndoBridge records it without labeling it high or low. Discuss it with your doctor.', category: 'General' },
  { term: 'Adherence', plain: 'Whether you took a medication the way it was prescribed.', category: 'General' },
  { term: 'OCR', plain: 'Optical character recognition: software that reads text from a photo or scanned page.', category: 'General' },
]

export function allGlossaryEntries(): GlossaryEntry[] {
  const seen = new Set<string>()
  return [
    ...Object.values(biomarkerGlossary),
    ...generalGlossary,
    ...Object.values(unitGlossary),
  ].filter((entry) => {
    if (seen.has(entry.term)) return false
    seen.add(entry.term)
    return true
  })
}

export function findGeneralTerm(term: string) {
  return generalGlossary.find((entry) => entry.term.toLowerCase() === term.toLowerCase())
}
