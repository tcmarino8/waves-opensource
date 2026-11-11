import type { StationConfig } from '../config/stations'
import type { StationData } from '../types/buoy'
import { degreesToCompass } from './direction'
import { deriveStatus, formatLocalDateTime } from './time'
import { celsiusToFahrenheit, metersToFeet } from './units'

export function buildBuoyReport(
  selectedStations: StationConfig[],
  stations: StationData[],
): string[] {
  const stationsById = new Map(stations.map((station) => [station.stationId, station]))

  return selectedStations.map(({ id, label }) => {
    const station = stationsById.get(id)
    if (!station) {
      return `${label}: Station data is not available yet.`
    }

    const sentences = [`${label}.`]
    const latest = station.latestObservation
    if (!latest) {
      sentences.push('No buoy observation is available.')
    } else {
      const observedAt = formatLocalDateTime(latest.timestamp)
      sentences.push(
        observedAt === '—'
          ? 'The buoy observation time is unavailable.'
          : `Buoy observation time: ${observedAt}.`,
      )
      if (station.status === 'offline') {
        sentences.push('This station is offline; these readings may be outdated.')
      } else if (station.status === 'delayed' || deriveStatus(latest.timestamp) === 'delayed') {
        sentences.push('This buoy observation is delayed.')
      }

      const heightFeet = metersToFeet(latest.waveHeight)
      sentences.push(
        heightFeet === null
          ? 'Significant wave height is unavailable.'
          : `Significant wave height is ${heightFeet.toFixed(1)} feet.`,
      )
      sentences.push(
        latest.dominantWavePeriod === null
          ? 'Dominant wave period is unavailable.'
          : `Dominant wave period is ${latest.dominantWavePeriod.toFixed(0)} seconds.`,
      )
      sentences.push(
        latest.meanWaveDirection === null
          ? 'Wave direction is unavailable.'
          : `Wave direction is ${latest.meanWaveDirection.toFixed(0)} degrees, ${degreesToCompass(latest.meanWaveDirection)}.`,
      )

      const waterTemperature = celsiusToFahrenheit(latest.waterTemperature)
      const airTemperature = celsiusToFahrenheit(latest.airTemperature)
      if (waterTemperature !== null) {
        sentences.push(`Water temperature is ${waterTemperature.toFixed(1)} degrees Fahrenheit.`)
      } else if (airTemperature !== null) {
        sentences.push(`Water temperature is unavailable. Air temperature is ${airTemperature.toFixed(1)} degrees Fahrenheit.`)
      } else {
        sentences.push('Water and air temperatures are unavailable.')
      }
    }

    if (station.error) {
      sentences.push('The latest station refresh failed; any buoy readings shown are from an earlier refresh.')
    }

    if (station.tide) {
      const tideTime = formatLocalDateTime(station.tide.timestamp)
      sentences.push(
        `Nearest tide station: ${station.tide.stationLabel}. Predicted tide level is ${station.tide.levelFeet.toFixed(2)} feet relative to mean lower low water${tideTime === '—' ? ', prediction time unavailable' : ` at ${tideTime}`}.`,
      )
    } else {
      sentences.push('A tide prediction is unavailable.')
    }
    if (station.tideError) {
      sentences.push('The latest tide data request failed.')
    }

    return sentences.join(' ')
  })
}
