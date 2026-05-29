export function calculateBmi({
  heightCm,
  weightKg,
}: {
  heightCm: number
  weightKg: number
}) {
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) {
    return null
  }

  const heightMeters = heightCm / 100
  return Number((weightKg / (heightMeters * heightMeters)).toFixed(1))
}
