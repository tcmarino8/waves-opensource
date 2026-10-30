import type { StationData } from '../types/buoy'
import { degreesToCompass } from '../utils/direction'
import { formatNumber, metersToFeet } from '../utils/units'

interface StationCardProps {
  station: StationData
}

export function StationCard({ station }: StationCardProps) {
  const latest = station.latestObservation
  const waveDirection = latest?.meanWaveDirection ?? null

  return (
    <article className="station-card">
      <h2>{station.stationLabel}</h2>
      <p className={`status-pill ${station.status}`}>{station.status}</p>

      <p className="primary-reading">{formatNumber(metersToFeet(latest?.waveHeight ?? null), 1, 'ft')}</p>
      <p className="caption">Significant Wave Height</p>

      <div className="station-metrics">
        <div>
          <div className="metric-label">Dominant Period</div>
          <div className="metric-value">{formatNumber(latest?.dominantWavePeriod ?? null, 0, 'sec')}</div>
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
