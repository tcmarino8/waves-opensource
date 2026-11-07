# SURF WATCH

SURF WATCH is a mobile-first Progressive Web App (PWA) for monitoring real-time NOAA NDBC buoy observations.

## Features

- Two-station surf dashboard (primary station `46274` + configurable second station).
- "Select Other Stations" picker that uses your location to suggest nearby NOAA stations.
- Exactly two active stations at a time (Station A and Station B).
- Real NOAA observation parsing from `realtime2/{stationId}.txt`.
- Tide level integration from NOAA Tides & Currents using nearest tide-prediction stations.
- Side-by-side buoy cards and side-by-side chart panels on larger screens.
- Adjustable chart windows (6, 12, 24, 36 hours) by swiping directly on either chart.
- Compact tide subplot in the Time Window panel, using NOAA Tides & Currents predictions for the selected window.
- Interactive spinning globe with buoy locations (drag to spin).
- Auto-refresh every 10 minutes plus manual refresh.
- Data staleness states (`online`, `delayed`, `offline`, `partial`).
- PWA install support (manifest + service worker).

## Configuration

Edit [stations.ts](./src/config/stations.ts):

- `PRIMARY_STATION` defaults to `46274`.
- `SECONDARY_STATION` is set to `46225`.
- `DEFAULT_STATIONS` are used when location is unavailable/denied.

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Optional NOAA Proxy (Vercel)

The frontend tries [/api/station](./api/station.ts) first, then falls back to direct NOAA fetch.
Nearby station discovery uses [/api/stations](./api/stations.ts), which proxies NOAA active-station XML.
Tide integration uses [/api/tide-stations](./api/tide-stations.ts) and [/api/tides](./api/tides.ts) for NOAA Tides & Currents data.

Deploying on Vercel will automatically expose this serverless function and improve reliability when direct NOAA CORS behavior changes.

## Install on iPhone (Safari)

1. Open the deployed HTTPS app in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Launch from the home screen icon.

## Install on Android (Chrome)

1. Open the deployed HTTPS app in Chrome.
2. Tap the browser menu.
3. Tap **Install app** (or **Add to Home Screen**).
4. Launch from the home screen icon.

## Notes

- NOAA timestamps are UTC and are converted to local time in the UI.
- Missing sentinel values (`MM`, `99`, `999`, `9999`, etc.) are treated as missing and are not displayed as measurements.
- Cached observations are never labeled as live; station status is based on observation recency.
- Design documentation for architecture and key files is in [DESIGN.md](./DESIGN.md).
