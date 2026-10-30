import type { StationConfig } from '../config/stations'

interface ActiveStationXmlNode {
  getAttribute: (name: string) => string | null
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusKm = 6371
  const deltaLat = toRadians(latitudeB - latitudeA)
  const deltaLon = toRadians(longitudeB - longitudeA)
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2)
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function parseStationsXml(rawXml: string): StationConfig[] {
  const xml = new DOMParser().parseFromString(rawXml, 'application/xml')
  const stationNodes = Array.from(xml.getElementsByTagName('station')) as ActiveStationXmlNode[]

  return stationNodes
    .map((node) => {
      const id = node.getAttribute('id')
      const name = node.getAttribute('name')
      const lat = Number(node.getAttribute('lat'))
      const lon = Number(node.getAttribute('lon'))

      if (!id || !name || !/^\d{5}$/.test(id) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null
      }

      return {
        id,
        label: `NOAA ${id} — ${name}`,
        latitude: lat,
        longitude: lon,
      } satisfies StationConfig
    })
    .filter((station): station is StationConfig => station !== null)
}

export async function fetchNearbyStations(
  latitude: number,
  longitude: number,
  limit = 20,
): Promise<StationConfig[]> {
  const response = await fetch('/api/stations', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to load station catalog (${response.status}).`)
  }
  const rawXml = await response.text()
  const stations = parseStationsXml(rawXml)

  return stations
    .map((station) => ({
      station,
      distanceKm: haversineKm(latitude, longitude, station.latitude, station.longitude),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, limit)
    .map((entry) => entry.station)
}
