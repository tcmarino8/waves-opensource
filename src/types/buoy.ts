export interface BuoyObservation {
  timestamp: string
  windDirection: number | null
  windSpeed: number | null
  windGust: number | null
  waveHeight: number | null
  dominantWavePeriod: number | null
  averageWavePeriod: number | null
  meanWaveDirection: number | null
  pressure: number | null
  airTemperature: number | null
  waterTemperature: number | null
}

export interface TideData {
  stationId: string
  stationLabel: string
  timestamp: string
  levelFeet: number
  observations: Array<{
    timestamp: string
    levelFeet: number
  }>
}

export type StationStatus = 'online' | 'delayed' | 'offline'

export interface StationData {
  stationId: string
  stationLabel: string
  observations: BuoyObservation[]
  latestObservation: BuoyObservation | null
  tide: TideData | null
  tideError?: string
  lastSuccessfulRefresh: string | null
  status: StationStatus
  error?: string
}

export type DashboardState = 'loading' | 'online' | 'partial' | 'delayed' | 'offline'
