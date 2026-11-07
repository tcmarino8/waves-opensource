import { haversineKm } from '../utils/geo'
import type { TideData } from '../types/buoy'

const TIDE_STATION_CACHE_MS = 12 * 60 * 60 * 1000
const TIDE_STATIONS_URL = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions&units=english'

interface TideStation {
  id: string
  name: string
  latitude: number
  longitude: number
}

interface TideStationsResponse {
  stations?: Array<{
    id?: string
    name?: string
    lat?: number
    lng?: number
  }>
}

interface TidePredictionsResponse {
  predictions?: Array<{
    t?: string
    v?: string
  }>
}

interface TideObservation {
  timestamp: string
  levelFeet: number
}

let cachedTideStations: TideStation[] | null = null
let lastTideStationsFetchMs = 0

function parsePredictionTimestamp(rawTimestamp: string): string | null {
  const parsed = new Date(rawTimestamp.replace(' ', 'T') + ':00Z')
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal,
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

function parseTideStations(payload: unknown): TideStation[] {
  const stations = (payload as TideStationsResponse).stations
  if (!Array.isArray(stations)) {
    throw new Error('Invalid tide station payload.')
  }

  return stations
    .map((station) => {
      const id = typeof station.id === 'string' ? station.id : null
      const name = typeof station.name === 'string' ? station.name : null
      const latitude = typeof station.lat === 'number' ? station.lat : Number.NaN
      const longitude = typeof station.lng === 'number' ? station.lng : Number.NaN

      if (!id || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null
      }

      return { id, name, latitude, longitude } satisfies TideStation
    })
    .filter((station): station is TideStation => station !== null)
}

async function loadTideStations(signal?: AbortSignal): Promise<TideStation[]> {
  if (
    cachedTideStations &&
    Date.now() - lastTideStationsFetchMs < TIDE_STATION_CACHE_MS &&
    cachedTideStations.length > 0
  ) {
    return cachedTideStations
  }

  let payload: unknown
  try {
    payload = await getJson('/api/tide-stations', signal)
  } catch (error) {
    const proxyError = error instanceof Error ? error.message : 'unknown proxy error'
    try {
      payload = await getJson(TIDE_STATIONS_URL, signal)
    } catch (directError) {
      const directErrorMessage =
        directError instanceof Error ? directError.message : 'unknown direct error'
      throw new Error(
        `Failed to load tide station catalog. Proxy failed (${proxyError}) and direct request failed (${directErrorMessage}).`,
      )
    }
  }

  const stations = parseTideStations(payload)
  if (stations.length === 0) {
    throw new Error('No tide stations available from NOAA.')
  }

  cachedTideStations = stations
  lastTideStationsFetchMs = Date.now()
  return stations
}

function parseTideObservations(payload: unknown, stationId: string): TideObservation[] {
  const predictions = (payload as TidePredictionsResponse).predictions
  if (!Array.isArray(predictions) || predictions.length === 0) {
    throw new Error(`No tide predictions returned for station ${stationId}.`)
  }

  return predictions
    .map((prediction) => {
      const levelFeet = Number(prediction?.v)
      const timestamp =
        typeof prediction?.t === 'string'
          ? parsePredictionTimestamp(prediction.t)
          : null
      if (!Number.isFinite(levelFeet) || !timestamp) {
        return null
      }
      return { timestamp, levelFeet } satisfies TideObservation
    })
    .filter((observation): observation is TideObservation => observation !== null)
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
}

async function fetchRecentTidePredictions(
  stationId: string,
  signal?: AbortSignal,
): Promise<TideObservation[]> {
  const query = `stationId=${encodeURIComponent(stationId)}&range=recent`
  const directUrl =
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
    `product=predictions&date=recent&datum=MLLW&time_zone=gmt&units=english&interval=6&format=json&station=${encodeURIComponent(stationId)}`

  let payload: unknown
  try {
    payload = await getJson(`/api/tides?${query}`, signal)
  } catch (error) {
    const proxyError = error instanceof Error ? error.message : 'unknown proxy error'
    try {
      payload = await getJson(directUrl, signal)
    } catch (directError) {
      const directErrorMessage =
        directError instanceof Error ? directError.message : 'unknown direct error'
      throw new Error(
        `Failed to load tide predictions for station ${stationId}. Proxy failed (${proxyError}) and direct request failed (${directErrorMessage}).`,
      )
    }
  }

  const observations = parseTideObservations(payload, stationId)
  if (observations.length === 0) {
    throw new Error(`No valid tide predictions returned for station ${stationId}.`)
  }

  return observations
}

export async function fetchTideDataForLocation(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<TideData> {
  const stations = await loadTideStations(signal)
  const nearest = stations.reduce((closest, station) => {
    const distanceKm = haversineKm(latitude, longitude, station.latitude, station.longitude)
    if (!closest || distanceKm < closest.distanceKm) {
      return { station, distanceKm }
    }
    return closest
  }, null as { station: TideStation; distanceKm: number } | null)

  if (!nearest) {
    throw new Error('Unable to determine nearest tide station.')
  }

  const observations = await fetchRecentTidePredictions(nearest.station.id, signal)
  const latestObservation = observations[observations.length - 1]

  return {
    stationId: nearest.station.id,
    stationLabel: nearest.station.name,
    timestamp: latestObservation.timestamp,
    levelFeet: latestObservation.levelFeet,
    observations,
  }
}
