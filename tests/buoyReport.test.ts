import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { StationConfig } from '../src/config/stations'
import type { StationData } from '../src/types/buoy'
import { buildBuoyReport } from '../src/utils/buoyReport'
import { formatLocalDateTime } from '../src/utils/time'

const selected: StationConfig[] = [
  { id: '12345', label: 'Station A', latitude: 0, longitude: 0 },
  { id: '67890', label: 'Station B', latitude: 0, longitude: 0 },
]

function station(overrides: Partial<StationData> = {}): StationData {
  const timestamp = new Date().toISOString()
  return {
    stationId: '12345',
    stationLabel: 'Station A',
    observations: [],
    latestObservation: {
      timestamp,
      windDirection: null,
      windSpeed: null,
      windGust: null,
      waveHeight: 1,
      dominantWavePeriod: 12,
      averageWavePeriod: null,
      meanWaveDirection: 45,
      pressure: null,
      airTemperature: 20,
      waterTemperature: 15,
    },
    tide: {
      stationId: 'tide',
      stationLabel: 'Nearby harbor',
      timestamp,
      levelFeet: 2.15,
      observations: [],
    },
    lastSuccessfulRefresh: timestamp,
    status: 'online',
    ...overrides,
  }
}

test('reports selected stations with conversions, observation times, and tide provenance', () => {
  const first = station()
  const second = station({ stationId: '67890', stationLabel: 'Station B' })
  const report = buildBuoyReport(selected, [second, first])

  assert.equal(report.length, 2)
  assert.match(report[0], /^Station A\./)
  assert.match(report[1], /^Station B\./)
  assert.ok(report[0].includes(formatLocalDateTime(first.latestObservation!.timestamp)))
  assert.match(report[0], /3\.3 feet/)
  assert.match(report[0], /12 seconds/)
  assert.match(report[0], /45 degrees, NE/)
  assert.match(report[0], /Water temperature is 59\.0 degrees Fahrenheit/)
  assert.match(report[0], /Nearest tide station: Nearby harbor\. Predicted tide level is 2\.15 feet relative to mean lower low water/)
  assert.ok(report[0].includes(formatLocalDateTime(first.tide!.timestamp)))
})

test('reports missing measurements, air temperature fallback, and tide errors', () => {
  const base = station()
  const missing = station({
    latestObservation: {
      ...base.latestObservation!,
      waveHeight: null,
      dominantWavePeriod: null,
      meanWaveDirection: null,
      waterTemperature: null,
    },
    tide: null,
    tideError: 'Network error',
  })
  const [report] = buildBuoyReport(selected, [missing])
  assert.match(report, /Significant wave height is unavailable/)
  assert.match(report, /Dominant wave period is unavailable/)
  assert.match(report, /Wave direction is unavailable/)
  assert.match(report, /Water temperature is unavailable\. Air temperature is 68\.0 degrees Fahrenheit/)
  assert.match(report, /A tide prediction is unavailable/)
  assert.match(report, /latest tide data request failed/)
})

test('identifies stale observations and failed refreshes independently', () => {
  const base = station()
  const stale = station({
    latestObservation: {
      ...base.latestObservation!,
      timestamp: new Date(Date.now() - 91 * 60_000).toISOString(),
    },
    error: 'Network error',
  })
  const [report] = buildBuoyReport(selected, [stale])
  assert.match(report, /buoy observation is delayed/)
  assert.match(report, /latest station refresh failed/)
  assert.match(report, /earlier refresh/)
})

test('preserves reported delayed status and handles unavailable times and temperatures', () => {
  const base = station()
  const incomplete = station({
    status: 'delayed',
    latestObservation: {
      ...base.latestObservation!,
      timestamp: 'invalid',
      waterTemperature: null,
      airTemperature: null,
    },
    tide: { ...base.tide!, timestamp: 'invalid' },
  })
  const [report] = buildBuoyReport(selected, [incomplete])
  assert.match(report, /buoy observation time is unavailable/i)
  assert.match(report, /buoy observation is delayed/)
  assert.match(report, /Water and air temperatures are unavailable/)
  assert.match(report, /prediction time unavailable/)
})

test('identifies offline stations and missing observations without hiding tide predictions', () => {
  const offline = station({ status: 'offline' })
  assert.match(buildBuoyReport(selected, [offline])[0], /station is offline/)

  const noObservation = station({ latestObservation: null })
  const [report] = buildBuoyReport(selected, [noObservation])
  assert.match(report, /No buoy observation is available/)
  assert.match(report, /Predicted tide level/)
})

test('does not report data from a previously selected station', () => {
  const [reportA, reportB] = buildBuoyReport(selected, [
    station({ stationId: '00000', stationLabel: 'Old station' }),
  ])
  assert.equal(reportA, 'Station A: Station data is not available yet.')
  assert.equal(reportB, 'Station B: Station data is not available yet.')
})
