import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function noaaDevProxyPlugin() {
  return {
    name: 'noaa-dev-proxy',
    configureServer(server: {
      middlewares: {
        use: (
          handler: (
            req: { url?: string; method?: string },
            res: {
              statusCode: number
              setHeader: (name: string, value: string) => void
              end: (body?: string) => void
            },
            next: () => void,
          ) => void,
        ) => void
      }
    }) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.url ? new URL(req.url, 'http://localhost') : null
        const pathname = requestUrl?.pathname ?? ''

        if (
          pathname !== '/api/station' &&
          pathname !== '/api/stations' &&
          pathname !== '/api/tide-stations' &&
          pathname !== '/api/tides'
        ) {
          next()
          return
        }

        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('Method not allowed.')
          return
        }

        if (pathname === '/api/stations') {
          try {
            const upstream = await fetch('https://www.ndbc.noaa.gov/activestations.xml', {
              headers: {
                Accept: 'application/xml,text/xml',
              },
            })

            const body = await upstream.text()
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/xml; charset=utf-8')
            res.end(body)
          } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(
              error instanceof Error
                ? `Failed to fetch station catalog: ${error.message}`
                : 'Failed to fetch station catalog.',
            )
          }
          return
        }

        if (pathname === '/api/tide-stations') {
          try {
            const upstream = await fetch(
              'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions&units=english',
              {
                headers: {
                  Accept: 'application/json',
                },
              },
            )

            const body = await upstream.text()
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(body)
          } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(
              error instanceof Error
                ? `Failed to fetch tide station catalog: ${error.message}`
                : 'Failed to fetch tide station catalog.',
            )
          }
          return
        }

        if (pathname === '/api/tides') {
          const tideStationId = requestUrl?.searchParams.get('stationId') ?? ''
          const tideRange = requestUrl?.searchParams.get('range') ?? 'latest'
          if (!/^[a-z0-9]{5,8}$/i.test(tideStationId)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end('Invalid tide station ID.')
            return
          }
          if (tideRange !== 'latest' && tideRange !== 'recent') {
            res.statusCode = 400
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end('Invalid tide range.')
            return
          }

          try {
            const upstream = await fetch(
              `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&date=${encodeURIComponent(tideRange)}&datum=MLLW&time_zone=gmt&units=english&interval=6&format=json&station=${encodeURIComponent(tideStationId)}`,
              {
                headers: {
                  Accept: 'application/json',
                },
              },
            )

            const body = await upstream.text()
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(body)
          } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(
              error instanceof Error
                ? `Failed to fetch tide prediction data: ${error.message}`
                : 'Failed to fetch tide prediction data.',
            )
          }
          return
        }

        const stationId = requestUrl?.searchParams.get('stationId') ?? ''

        if (!/^\d{5}$/.test(stationId)) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('Invalid station ID.')
          return
        }

        try {
          const upstream = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`, {
            headers: {
              Accept: 'text/plain',
            },
          })

          const body = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(body)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(
            error instanceof Error
              ? `Failed to fetch NOAA data: ${error.message}`
              : 'Failed to fetch NOAA data.',
          )
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    noaaDevProxyPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SURF WATCH',
        short_name: 'SURF',
        description: 'Personal NOAA buoy dashboard for surf conditions.',
        theme_color: '#041a2f',
        background_color: '#041a2f',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.ndbc\.noaa\.gov\/data\/realtime2\/.*\.txt$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'noaa-observations',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60,
              },
              networkTimeoutSeconds: 8,
            },
          },
        ],
      },
    }),
  ],
})
