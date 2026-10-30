import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { REFRESH_INTERVAL_MS } from '../config/stations'
import { fetchStationData } from '../services/noaaService'
import type { DashboardState, StationData } from '../types/buoy'
import type { StationConfig } from '../config/stations'
import { deriveStatus } from '../utils/time'

interface BuoyDataResult {
  stations: StationData[]
  dashboardState: DashboardState
  isRefreshing: boolean
  lastSuccessfulRefresh: string | null
  refresh: () => Promise<void>
}

function deriveDashboardState(stations: StationData[]): DashboardState {
  if (stations.length === 0) {
    return 'loading'
  }

  const onlineCount = stations.filter((station) => station.status === 'online').length
  const delayedCount = stations.filter((station) => station.status === 'delayed').length

  if (onlineCount === stations.length) {
    return 'online'
  }
  if (onlineCount > 0) {
    return 'partial'
  }
  if (delayedCount > 0) {
    return 'delayed'
  }
  return 'offline'
}

export function useBuoyData(selectedStations: StationConfig[]): BuoyDataResult {
  const [stations, setStations] = useState<StationData[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshLock = useRef(false)
  const selectedStationsRef = useRef(selectedStations)

  useEffect(() => {
    selectedStationsRef.current = selectedStations
  }, [selectedStations])

  const refresh = useCallback(async () => {
    if (refreshLock.current) {
      return
    }

    refreshLock.current = true
    setIsRefreshing(true)

    const targetStations = selectedStationsRef.current
    const result = await Promise.allSettled(targetStations.map((station) => fetchStationData(station)))

    setStations((previousStations) => {
      const previousById = new Map(
        previousStations.map((station) => [station.stationId, station] as const),
      )

      return targetStations.map((station, index) => {
        const stationResult = result[index]
        if (stationResult.status === 'fulfilled') {
          return stationResult.value
        }

        const previous = previousById.get(station.id)
        if (previous) {
          return {
            ...previous,
            status: deriveStatus(previous.latestObservation?.timestamp ?? null),
            error: stationResult.reason instanceof Error
              ? stationResult.reason.message
              : 'Failed to refresh station data.',
          }
        }

        return {
          stationId: station.id,
          stationLabel: station.label,
          observations: [],
          latestObservation: null,
          lastSuccessfulRefresh: null,
          status: 'offline',
          error: stationResult.reason instanceof Error
            ? stationResult.reason.message
            : 'Failed to refresh station data.',
        }
      })
    })

    setIsRefreshing(false)
    refreshLock.current = false
  }, [])

  const selectedStationKey = useMemo(
    () => selectedStations.map((station) => station.id).join('|'),
    [selectedStations],
  )

  useEffect(() => {
    refresh().catch((error: unknown) => {
      console.error('Initial NOAA refresh failed:', error)
    })

    const intervalId = window.setInterval(() => {
      refresh().catch((error: unknown) => {
        console.error('Scheduled NOAA refresh failed:', error)
      })
    }, REFRESH_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh().catch((error: unknown) => {
          console.error('Visibility NOAA refresh failed:', error)
        })
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh, selectedStationKey])

  const dashboardState = useMemo(() => deriveDashboardState(stations), [stations])

  const lastSuccessfulRefresh = useMemo(
    () =>
      stations
        .map((station) => station.lastSuccessfulRefresh)
        .filter((timestamp): timestamp is string => Boolean(timestamp))
        .sort()
        .at(-1) ?? null,
    [stations],
  )

  return {
    stations,
    dashboardState,
    isRefreshing,
    lastSuccessfulRefresh,
    refresh,
  }
}
