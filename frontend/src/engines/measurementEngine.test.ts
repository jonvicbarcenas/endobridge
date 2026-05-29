import { describe, expect, it } from 'vitest'
import { calculateBmi } from './measurementEngine'

describe('calculateBmi', () => {
  it('calculates BMI from kilograms and centimeters with one decimal place', () => {
    expect(calculateBmi({ weightKg: 68, heightCm: 160 })).toBe(26.6)
  })

  it('returns null when height or weight cannot produce a valid BMI', () => {
    expect(calculateBmi({ weightKg: 0, heightCm: 160 })).toBeNull()
    expect(calculateBmi({ weightKg: 68, heightCm: 0 })).toBeNull()
  })
})
