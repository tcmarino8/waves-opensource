import type { BuoyObservation } from '../types/buoy'

const MISSING_NUMERIC_SENTINEL = /^9{2,}(\.0+)?$/

function parseYear(rawYear: string): number | null {
  const year = Number(rawYear)
  if (!Number.isFinite(year)) {
    return null
  }
  if (year >= 100) {
    return year
  }
  return year >= 70 ? 1900 + year : 2000 + year
}

function parseNumeric(rawValue: string | undefined): number | null {
  if (!rawValue || rawValue === 'MM') {
    return null
  }
  if (MISSING_NUMERIC_SENTINEL.test(rawValue)) {
    return null
  }
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) ? parsed : null
}

function extractHeader(lines: string[]): string[] {
  const headerLine = lines.find((line) => line.startsWith('#YY') || line.startsWith('YY'))
  if (!headerLine) {
    throw new Error('Unable to locate NDBC header line.')
  }
  return headerLine.replace(/^#/, '').trim().split(/\s+/)
}

export function parseNdbcText(rawText: string): BuoyObservation[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const headers = extractHeader(lines)
  const dataLines = lines.filter((line) => !line.startsWith('#'))
  const timestampSet = new Set<string>()
  const observations: BuoyObservation[] = []

  for (const row of dataLines) {
    const tokens = row.split(/\s+/)
    if (tokens.length < 5) {
      continue
    }

    const values: Record<string, string> = {}
    headers.forEach((header, index) => {
      values[header] = tokens[index]
    })

    const year = parseYear(values.YY)
    const month = Number(values.MM)
    const day = Number(values.DD)
    const hour = Number(values.hh)
    const minute = Number(values.mm)

    if (
      !year ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      !Number.isFinite(hour) ||
      !Number.isFinite(minute)
    ) {
      continue
    }

    const timestamp = new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString()
    if (Number.isNaN(new Date(timestamp).getTime()) || timestampSet.has(timestamp)) {
      continue
    }
    timestampSet.add(timestamp)

    observations.push({
      timestamp,
      windDirection: parseNumeric(values.WDIR),
      windSpeed: parseNumeric(values.WSPD),
      windGust: parseNumeric(values.GST),
      waveHeight: parseNumeric(values.WVHT),
      dominantWavePeriod: parseNumeric(values.DPD),
      averageWavePeriod: parseNumeric(values.APD),
      meanWaveDirection: parseNumeric(values.MWD),
      pressure: parseNumeric(values.PRES),
      airTemperature: parseNumeric(values.ATMP),
      waterTemperature: parseNumeric(values.WTMP),
    })
  }

  return observations.sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  )
}
