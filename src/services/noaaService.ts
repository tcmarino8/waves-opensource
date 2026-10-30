import type { StationConfig } from '../config/stations'
import type { StationData } from '../types/buoy'
import { parseNdbcText } from './dataParser'
import { deriveStatus } from '../utils/time'

const NOAA_BASE_URL = 'https://www.ndbc.noaa.gov/data/realtime2'

function validateStationId(stationId: string): void {
  if (!/^\d{5}$/.test(stationId)) {
    throw new Error(`Invalid station ID: ${stationId}`)
  }
}

async function getStationText(stationId: string, signal?: AbortSignal): Promise<string> {
  const proxyUrl = `/api/station?stationId=${stationId}`
  const noaaUrl = `${NOAA_BASE_URL}/${stationId}.txt`

  let proxyError: string | null = null
  try {
    const proxyResponse = await fetch(proxyUrl, {
      signal,
      cache: 'no-store',
    })
    if (proxyResponse.ok) {
      return proxyResponse.text()
    }
    proxyError = `proxy status ${proxyResponse.status}`
  } catch (error) {
    proxyError = error instanceof Error ? error.message : 'unknown proxy error'
  }

  try {
    const directResponse = await fetch(noaaUrl, { signal, cache: 'no-store' })
    if (directResponse.ok) {
      return directResponse.text()
    }
    throw new Error(`direct NOAA status ${directResponse.status}`)
  } catch (error) {
    const directError = error instanceof Error ? error.message : 'unknown direct NOAA error'
    throw new Error(
      `Unable to fetch station ${stationId}. Proxy failed (${proxyError ?? 'no proxy response'}) and direct NOAA fetch failed (${directError}).`,
    )
  }
}

export async function fetchStationData(
  station: StationConfig,
  signal?: AbortSignal,
): Promise<StationData> {
  validateStationId(station.id)
  const rawText = await getStationText(station.id, signal)
  const observations = parseNdbcText(rawText)
  const latestObservation = observations.length > 0 ? observations[observations.length - 1] : null

  return {
    stationId: station.id,
    stationLabel: station.label,
    observations,
    latestObservation,
    lastSuccessfulRefresh: new Date().toISOString(),
    status: deriveStatus(latestObservation?.timestamp ?? null),
  }
}
