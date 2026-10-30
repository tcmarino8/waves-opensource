const FEET_PER_METER = 3.28084
const MPH_PER_MPS = 2.23694

export function metersToFeet(meters: number | null): number | null {
  return meters === null ? null : meters * FEET_PER_METER
}

export function mpsToMph(mps: number | null): number | null {
  return mps === null ? null : mps * MPH_PER_MPS
}

export function celsiusToFahrenheit(celsius: number | null): number | null {
  return celsius === null ? null : (celsius * 9) / 5 + 32
}

export function formatNumber(
  value: number | null,
  decimals: number,
  unit?: string,
): string {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }

  const formatted = value.toFixed(decimals)
  return unit ? `${formatted} ${unit}` : formatted
}
