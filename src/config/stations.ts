export interface StationConfig {
  id: string
  label: string
  latitude: number
  longitude: number
}

export const PRIMARY_STATION: StationConfig = {
  id: '46274',
  label: 'NOAA 46274',
  latitude: 33.062,
  longitude: -117.314,
}

export const SECONDARY_STATION: StationConfig = {
  id: '46225',
  label: 'NOAA 46225',
  latitude: 32.933,
  longitude: -117.391,
}

export const DEFAULT_STATIONS: StationConfig[] = [PRIMARY_STATION, SECONDARY_STATION]
export const STATION_SELECTION_LIMIT = 2

export const REFRESH_INTERVAL_MS = 10 * 60 * 1000
export const HISTORY_WINDOW_HOURS = 10
