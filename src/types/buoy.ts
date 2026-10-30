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

export type StationStatus = 'online' | 'delayed' | 'offline'

export interface StationData {
  stationId: string
  stationLabel: string
  observations: BuoyObservation[]
  latestObservation: BuoyObservation | null
  lastSuccessfulRefresh: string | null
  status: StationStatus
  error?: string
}

export type DashboardState = 'loading' | 'online' | 'partial' | 'delayed' | 'offline'
