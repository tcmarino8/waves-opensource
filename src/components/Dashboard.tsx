import { useEffect, useState, useMemo } from 'react'
import { Header } from './Header'
import { StationCard } from './StationCard'
import { WaveHeightChart } from './WaveHeightChart'
import { WavePeriodChart } from './WavePeriodChart'
import { BuoyGlobe } from './BuoyGlobe'
import { useBuoyData } from '../hooks/useBuoyData'
import {
  DEFAULT_STATIONS,
  STATION_SELECTION_LIMIT,
  type StationConfig,
} from '../config/stations'
import { fetchNearbyStations } from '../services/stationCatalogService'
import { formatLocalDateTime } from '../utils/time'
import './dashboard.css'

const WINDOW_OPTIONS = [5, 10, 20] as const

function dedupeStations(stations: StationConfig[]): StationConfig[] {
  const map = new Map<string, StationConfig>()
  for (const station of stations) {
    map.set(station.id, station)
  }
  return Array.from(map.values())
}

export function Dashboard() {
  const [windowHours, setWindowHours] = useState<(typeof WINDOW_OPTIONS)[number]>(10)
  const [stationOptions, setStationOptions] = useState<StationConfig[]>(DEFAULT_STATIONS)
  const [selectedStationIds, setSelectedStationIds] = useState<[string, string]>([
    DEFAULT_STATIONS[0].id,
    DEFAULT_STATIONS[1].id,
  ])
  const [isLocatingStations, setIsLocatingStations] = useState(false)
  const [locationSupported, setLocationSupported] = useState(true)
  const [stationSelectionNote, setStationSelectionNote] = useState(
    'Using default stations. Tap "Use my location" to load nearby stations.',
  )

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationSupported(false)
      setStationSelectionNote('Location is not available in this browser. Showing default stations.')
    }
  }, [])

  const loadNearbyStationsFromLocation = () => {
    if (!navigator.geolocation) {
      setLocationSupported(false)
      setStationSelectionNote('Location is not available in this browser. Showing default stations.')
      return
    }

    setIsLocatingStations(true)
    setStationSelectionNote('Waiting for location permission...')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const nearbyStations = await fetchNearbyStations(
            position.coords.latitude,
            position.coords.longitude,
            20,
          )
          const combined = dedupeStations([...DEFAULT_STATIONS, ...nearbyStations])
          setStationOptions(combined)
          setStationSelectionNote('Nearest NOAA stations loaded from your location.')

          if (combined.length >= STATION_SELECTION_LIMIT) {
            setSelectedStationIds([combined[0].id, combined[1].id])
          }
        } catch (error) {
          setStationSelectionNote(
            error instanceof Error
              ? `Unable to load nearby stations: ${error.message}`
              : 'Unable to load nearby stations.',
          )
        } finally {
          setIsLocatingStations(false)
        }
      },
      () => {
        setIsLocatingStations(false)
        setStationSelectionNote('Location access denied. Showing default stations.')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    )
  }

  const stationById = useMemo(
    () => new Map(stationOptions.map((station) => [station.id, station] as const)),
    [stationOptions],
  )

  const selectedStations = useMemo(() => {
    const fallback = DEFAULT_STATIONS
    return selectedStationIds.map(
      (stationId, index) => stationById.get(stationId) ?? fallback[index],
    ) as [StationConfig, StationConfig]
  }, [selectedStationIds, stationById])

  const {
    stations,
    dashboardState,
    isRefreshing,
    lastSuccessfulRefresh,
    refresh,
  } = useBuoyData(selectedStations)

  const chartAnchorTimeMs = useMemo(() => {
    const latestObservationMs = Math.max(
      ...stations.map((station) =>
        station.latestObservation ? new Date(station.latestObservation.timestamp).getTime() : 0,
      ),
    )
    return latestObservationMs > 0 ? latestObservationMs : Date.now()
  }, [stations])

  const shiftWindow = (step: 1 | -1) => {
    setWindowHours((currentWindow) => {
      const currentIndex = WINDOW_OPTIONS.indexOf(currentWindow)
      const nextIndex = Math.max(0, Math.min(WINDOW_OPTIONS.length - 1, currentIndex + step))
      return WINDOW_OPTIONS[nextIndex]
    })
  }

  const handleStationChange = (index: 0 | 1, stationId: string) => {
    setSelectedStationIds((current) => {
      const next: [string, string] = [...current] as [string, string]
      const otherIndex: 0 | 1 = index === 0 ? 1 : 0

      if (stationId === next[otherIndex]) {
        next[otherIndex] = next[index]
      }
      next[index] = stationId
      return next
    })
  }

  return (
    <main className="dashboard">
      <Header
        dashboardState={dashboardState}
        isRefreshing={isRefreshing}
        lastSuccessfulRefresh={lastSuccessfulRefresh}
        onRefresh={refresh}
      />

      <section className="panel">
        <h3>Select Other Stations</h3>
        <button
          type="button"
          className="refresh-button"
          onClick={loadNearbyStationsFromLocation}
          disabled={!locationSupported || isLocatingStations}
        >
          {isLocatingStations ? 'Locating...' : 'Use my location'}
        </button>
        <div className="station-picker-grid">
          <label className="station-picker-label">
            Station A
            <select
              className="station-picker-select"
              value={selectedStationIds[0]}
              onChange={(event) => handleStationChange(0, event.target.value)}
            >
              {stationOptions.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.label}
                </option>
              ))}
            </select>
          </label>
          <label className="station-picker-label">
            Station B
            <select
              className="station-picker-select"
              value={selectedStationIds[1]}
              onChange={(event) => handleStationChange(1, event.target.value)}
            >
              {stationOptions.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="footer-note">{stationSelectionNote}</p>
      </section>

      <section className="station-grid">
        {stations.map((station) => (
          <StationCard key={station.stationId} station={station} />
        ))}
      </section>

      <section className="panel">
        <h3>Time Window</h3>
        <div className="window-readout">{windowHours} hrs</div>
        <p className="footer-note">
          Swipe left on either chart for a smaller window, right for a larger window.
        </p>
      </section>

      <section className="chart-grid">
        <WaveHeightChart
          stations={stations}
          windowHours={windowHours}
          anchorTimeMs={chartAnchorTimeMs}
          onWindowShift={shiftWindow}
        />
        <WavePeriodChart
          stations={stations}
          windowHours={windowHours}
          anchorTimeMs={chartAnchorTimeMs}
          onWindowShift={shiftWindow}
        />
      </section>
      <BuoyGlobe stations={selectedStations} />

      <footer className="panel footer-note">
        <p>NOAA NDBC observations. Data may be delayed depending on station telemetry.</p>
        <p>Last successful dashboard refresh: {formatLocalDateTime(lastSuccessfulRefresh)}</p>
        <p>
          Latest observation:{' '}
          {formatLocalDateTime(
            stations
              .map((station) => station.latestObservation?.timestamp ?? null)
              .filter((timestamp): timestamp is string => Boolean(timestamp))
              .sort()
              .at(-1) ?? null,
          )}
        </p>
      </footer>
    </main>
  )
}
