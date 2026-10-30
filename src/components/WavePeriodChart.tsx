import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
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
import { filterToRecentWindow, formatLocalTime } from '../utils/time'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

interface WavePeriodChartProps {
  stations: StationData[]
  windowHours: number
  anchorTimeMs: number
  onWindowShift: (step: -1 | 1) => void
}

export function WavePeriodChart({
  stations,
  windowHours,
  anchorTimeMs,
  onWindowShift,
}: WavePeriodChartProps) {
  const pointerStartX = useRef<number | null>(null)

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartX.current = event.clientX
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) {
      return
    }
    const deltaX = event.clientX - pointerStartX.current
    pointerStartX.current = null

    if (deltaX <= -35) {
      onWindowShift(-1)
      return
    }
    if (deltaX >= 35) {
      onWindowShift(1)
    }
  }

  const recentByStation = stations.map((station) =>
    filterToRecentWindow(station.observations, windowHours, anchorTimeMs),
  )

  const anchorTimestamp = new Date(anchorTimeMs).toISOString()

  const allTimestamps = Array.from(
    new Set(
      recentByStation
        .flatMap((observations) => observations.map((observation) => observation.timestamp))
        .concat(anchorTimestamp),
    ),
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const colors = ['#4ad3d8', '#e6a8ff']

  return (
    <section className="panel">
      <h3>Wave Period — Last {windowHours} Hours</h3>
      <div className="chart-wrapper" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        <Line
          data={{
            labels: allTimestamps.map((timestamp) =>
              timestamp === anchorTimestamp ? 'Now' : formatLocalTime(timestamp),
            ),
            datasets: stations.map((station, index) => {
              const byTimestamp = new Map(
                recentByStation[index].map((item) => [item.timestamp, item.dominantWavePeriod] as const),
              )
              return {
                label: station.stationLabel,
                data: allTimestamps.map((timestamp) => byTimestamp.get(timestamp) ?? null),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length],
                borderDash: [2, 4],
                pointRadius: 2,
                pointHoverRadius: 3,
                tension: 0.2,
                spanGaps: false,
              }
            }),
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                title: { display: true, text: 'Seconds' },
                grid: { color: 'rgba(255,255,255,0.08)' },
                ticks: { maxTicksLimit: 4 },
              },
              x: {
                reverse: true,
                grid: { color: 'rgba(255,255,255,0.08)' },
                ticks: { maxTicksLimit: 4 },
              },
            },
            plugins: {
              legend: {
                labels: { color: '#f8fbff' },
              },
              tooltip: {
                callbacks: {
                  title: (tooltipItems) => {
                    const item = tooltipItems[0]
                    const timestamp = allTimestamps[item.dataIndex]
                    return new Date(timestamp).toLocaleString()
                  },
                },
              },
            },
          }}
        />
      </div>
    </section>
  )
}
