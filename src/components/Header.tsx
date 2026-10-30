import type { DashboardState } from '../types/buoy'
import { formatLocalDateTime } from '../utils/time'

interface HeaderProps {
  dashboardState: DashboardState
  lastSuccessfulRefresh: string | null
  isRefreshing: boolean
  onRefresh: () => Promise<void>
}

const STATE_LABELS: Record<DashboardState, string> = {
  loading: 'Loading',
  online: 'Current',
  partial: 'Partial',
  delayed: 'Delayed',
  offline: 'Offline',
}

export function Header({
  dashboardState,
  lastSuccessfulRefresh,
  isRefreshing,
  onRefresh,
}: HeaderProps) {
  return (
    <header className="header-card">
      <h1>Bouy Data</h1>
      <p className="subtitle">PACIFIC COAST | NOAA BUOY MONITOR</p>
      <div className="header-meta">
        <span className={`status-pill ${dashboardState}`}>{STATE_LABELS[dashboardState]}</span>
        <span className="footer-note">NOAA NDBC data source</span>
        <span className="footer-note">
          Last refresh: {formatLocalDateTime(lastSuccessfulRefresh)}
        </span>
        <div className="header-actions">
          <button
            className="refresh-button"
            type="button"
            onClick={() => {
              onRefresh().catch((error: unknown) => {
                console.error('Manual refresh failed:', error)
              })
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </header>
  )
}
