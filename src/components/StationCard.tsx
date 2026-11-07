import type { StationData } from '../types/buoy'
import { degreesToCompass } from '../utils/direction'
import { formatLocalDateTime } from '../utils/time'
import { celsiusToFahrenheit, formatNumber, metersToFeet } from '../utils/units'

export type PeriodTrajectory = 'increasing' | 'decreasing' | 'steady' | 'unknown'

interface StationCardProps {
  station: StationData
  periodTrajectory: PeriodTrajectory
}

export function StationCard({ station, periodTrajectory }: StationCardProps) {
  const latest = station.latestObservation
  const waveDirection = latest?.meanWaveDirection ?? null
  const temperatureCelsius = latest?.waterTemperature ?? latest?.airTemperature ?? null
  const temperatureLabel =
    latest?.waterTemperature !== null && latest?.waterTemperature !== undefined
      ? 'Water Temperature'
      : 'Air Temperature'
  const tideTitle = station.tideError
    ? station.tideError
    : station.tide
      ? `Nearest tide station: ${station.tide.stationLabel}. Latest prediction: ${formatLocalDateTime(station.tide.timestamp)}.`
      : undefined

  return (
    <article className="station-card">
      <h2>{station.stationLabel}</h2>
      <p className={`status-pill ${station.status}`}>{station.status}</p>

      <p className="primary-reading">{formatNumber(metersToFeet(latest?.waveHeight ?? null), 1, 'ft')}</p>
      <p className="caption">Significant Wave Height</p>
      <p className={`temperature-reading ${periodTrajectory}`}>
        {formatNumber(celsiusToFahrenheit(temperatureCelsius), 1, '°F')}
      </p>
      <p className="caption">{temperatureLabel}</p>

      <div className="station-metrics">
        <div>
          <div className="metric-label">Dominant Period</div>
          <div className="metric-value">{formatNumber(latest?.dominantWavePeriod ?? null, 0, 'sec')}</div>
        </div>
        <div>
          <div className="metric-label">Tide Level (MLLW)</div>
          <div className="metric-value" title={tideTitle}>
            {formatNumber(station.tide?.levelFeet ?? null, 2, 'ft')}
          </div>
        </div>
        <div>
          <div className="metric-label">Wave Direction</div>
          <div className="metric-value">
            {waveDirection === null
              ? '—'
              : `${formatNumber(waveDirection, 0, '°')} ${degreesToCompass(waveDirection)}`}
          </div>
        </div>
      </div>
    </article>
  )
}
