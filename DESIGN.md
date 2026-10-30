# SURF WATCH Design Overview

This document highlights the main files, components, and data flow used in the SURF WATCH app.

## 1) Top-level architecture

SURF WATCH is a React + TypeScript single-page PWA with this flow:

1. UI asks for station data through a hook.
2. Service fetches NOAA text (proxy-first, direct fallback).
3. Parser converts raw text rows into typed observations.
4. UI components render the latest values, 10-hour charts, and buoy globe.

## 2) Key files and responsibilities

## App shell and entry

- [src/main.tsx](./src/main.tsx)  
  App bootstrap and service-worker registration.

- [src/App.tsx](./src/App.tsx)  
  Thin app root that renders the dashboard.

- [src/components/Dashboard.tsx](./src/components/Dashboard.tsx)  
  Main page composition: header, "Select Other Stations" picker, side-by-side station cards, time-window readout, side-by-side charts with swipe controls, globe, footer.

## Data lifecycle

- [src/hooks/useBuoyData.ts](./src/hooks/useBuoyData.ts)  
  Central state manager for station data. Handles:
  - initial load
  - 10-minute auto refresh
  - manual refresh
  - foreground/visibility refresh
  - dynamic selected station set (exactly two stations)
  - per-station failure isolation and last-good-data retention

- [src/services/noaaService.ts](./src/services/noaaService.ts)  
  Station fetch logic:
  - validates station IDs
  - fetches `/api/station?stationId=...` first
  - falls back to direct NOAA URL when needed
  - builds normalized `StationData` output

- [src/services/dataParser.ts](./src/services/dataParser.ts)  
  NOAA text parser:
  - detects dynamic headers
  - parses UTC timestamps
  - handles missing sentinels (`MM`, `99*`, etc.)
  - rejects malformed rows
  - deduplicates and sorts observations

- [src/services/stationCatalogService.ts](./src/services/stationCatalogService.ts)  
  Location-based station discovery:
  - loads NOAA active station XML
  - parses buoy station metadata
  - computes nearest stations by geodesic distance
  - returns top nearby options for selection

## Configuration and types

- [src/config/stations.ts](./src/config/stations.ts)  
  Default station IDs and labels (`46274`, `46225`), station coordinates, station-selection limit, plus refresh/history window constants.

- [src/types/buoy.ts](./src/types/buoy.ts)  
  Shared TypeScript interfaces for observations and station status.

## UI components

- [src/components/Header.tsx](./src/components/Header.tsx)  
  Title, source label, dashboard status, last refresh, refresh button.

- [src/components/StationCard.tsx](./src/components/StationCard.tsx)  
  Per-station primary readings:
  - significant wave height
  - dominant period
  - mean wave direction

- [src/components/WaveHeightChart.tsx](./src/components/WaveHeightChart.tsx)  
  Wave height comparison chart (ft), gap-aware for missing points, using selected window (5/10/20 hours).

- [src/components/WavePeriodChart.tsx](./src/components/WavePeriodChart.tsx)  
  Dominant period comparison chart (sec), same shared selected time window.

- [src/components/BuoyGlobe.tsx](./src/components/BuoyGlobe.tsx)  
  Interactive orthographic globe with:
  - auto-spin animation
  - drag-to-rotate interaction
  - buoy markers and station labels

- [src/components/dashboard.css](./src/components/dashboard.css)  
  Mobile-first dark styling and responsive layout.

## Utilities

- [src/utils/time.ts](./src/utils/time.ts)  
  UTC-to-local formatting, rolling window filtering, station recency status.

- [src/utils/units.ts](./src/utils/units.ts)  
  Unit conversions and numeric formatting helpers.

- [src/utils/direction.ts](./src/utils/direction.ts)  
  Degree-to-16-point compass conversion.

## PWA and deployment support

- [vite.config.ts](./vite.config.ts)  
  Vite config with:
  - PWA manifest/service worker setup
  - local dev middleware for `/api/station`
  - local dev middleware for `/api/stations`

- [api/station.ts](./api/station.ts)  
  Vercel serverless proxy endpoint with station validation, timeout handling, and cache headers.

- [api/stations.ts](./api/stations.ts)  
  Vercel serverless proxy endpoint for NOAA active-station catalog XML.

## 3) Data model snapshot

- `BuoyObservation`: one timestamped NOAA row normalized to numeric/null fields.
- `StationData`: station metadata + parsed observations + status metadata.
- Dashboard status: aggregate state (`loading`, `online`, `partial`, `delayed`, `offline`).

## 4) Refresh and reliability behavior

- Refresh interval: every 10 minutes.
- Manual refresh available in UI.
- On station fetch failure:
  - keep last successful observations
  - update station status from observation age
  - do not fabricate replacement values

## 5) Current scope

Included:
- two-station NOAA comparison
- wave-focused cards and charts
- interactive buoy globe map
- installable PWA shell

Excluded:
- wind features (removed)
- additional future enhancements listed in project plan
