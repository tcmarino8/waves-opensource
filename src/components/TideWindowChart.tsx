import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { StationData } from '../types/buoy'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

interface TideWindowChartProps {
  stations: StationData[]
  windowHours: number
  anchorTimeMs: number
}

interface TidePoint {
  timestamp: string
  levelFeet: number
}

function filterTideWindow(
  observations: TidePoint[],
  windowHours: number,
  anchorTimeMs: number,
): TidePoint[] {
  const windowStartMs = anchorTimeMs - windowHours * 60 * 60 * 1000
  return observations
    .filter((observation) => new Date(observation.timestamp).getTime() >= windowStartMs)
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
}

function findExtremaTimestamps(observations: TidePoint[]): Set<string> {
  const extrema = new Set<string>()
  for (let index = 1; index < observations.length - 1; index += 1) {
    const previous = observations[index - 1].levelFeet
    const current = observations[index].levelFeet
    const next = observations[index + 1].levelFeet
    const isPeak = current > previous && current > next
    const isValley = current < previous && current < next
    if (isPeak || isValley) {
      extrema.add(observations[index].timestamp)
    }
  }
  return extrema
}

function formatTime24(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

function formatDateTime24(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

export function TideWindowChart({ stations, windowHours, anchorTimeMs }: TideWindowChartProps) {
  const tideByStation = stations.map((station) =>
    filterTideWindow(station.tide?.observations ?? [], windowHours, anchorTimeMs),
  )
  const extremaByStation = tideByStation.map((observations) => findExtremaTimestamps(observations))

  const allTimestamps = Array.from(
    new Set(
      tideByStation.flatMap((observations) =>
        observations.map((observation) => observation.timestamp),
      ),
    ),
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (allTimestamps.length === 0) {
    return <p className="footer-note tide-window-empty">Tide plot unavailable for this window.</p>
  }

  const allLevels = tideByStation.flatMap((observations) =>
    observations.map((observation) => observation.levelFeet),
  )
  const minLevel = allLevels.length > 0 ? Math.min(...allLevels) : -2
  const maxLevel = allLevels.length > 0 ? Math.max(...allLevels) : 8
  const yMin = Math.min(-2, Math.floor(minLevel))
  const yMax = Math.max(8, Math.ceil(maxLevel))

  const colors = ['#74d8d8', '#9f93ff']

  return (
    <div className="tide-window-chart">
      <Line
        data={{
          labels: allTimestamps.map((timestamp) => formatTime24(timestamp)),
          datasets: stations.map((station, index) => {
            const byTimestamp = new Map(
              tideByStation[index].map((observation) => [observation.timestamp, observation.levelFeet] as const),
            )
            return {
              label: station.stationLabel,
              data: allTimestamps.map((timestamp) => byTimestamp.get(timestamp) ?? null),
              borderColor: colors[index % colors.length],
              backgroundColor: colors[index % colors.length],
              pointStyle: 'crossRot',
              pointRadius: allTimestamps.map((timestamp) =>
                extremaByStation[index].has(timestamp) ? 4 : 0,
              ),
              pointHoverRadius: allTimestamps.map((timestamp) =>
                extremaByStation[index].has(timestamp) ? 5 : 2,
              ),
              tension: 0.2,
              borderWidth: 1.8,
              spanGaps: false,
            }
          }),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              title: { display: true, text: 'Tide (ft)' },
              min: yMin,
              max: yMax,
              grid: { color: 'rgba(255,255,255,0.08)' },
              ticks: { maxTicksLimit: 3 },
            },
            x: {
              reverse: true,
              grid: { color: 'rgba(255,255,255,0.08)' },
              ticks: { maxTicksLimit: 4 },
            },
          },
          plugins: {
            legend: {
              labels: {
                color: '#f8fbff',
                boxWidth: 10,
                boxHeight: 2,
                padding: 10,
                font: { size: 10 },
              },
            },
            tooltip: {
              callbacks: {
                title: (tooltipItems) => {
                  const item = tooltipItems[0]
                  const timestamp = allTimestamps[item.dataIndex]
                  return formatDateTime24(timestamp)
                },
              },
            },
          },
        }}
      />
    </div>
  )
}
