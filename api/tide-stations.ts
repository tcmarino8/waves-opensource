import type { VercelRequest, VercelResponse } from '@vercel/node'

const TIDE_STATIONS_URL =
  'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions&units=english'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    const response = await fetch(TIDE_STATIONS_URL, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      res.status(response.status).send('NOAA tide station catalog request failed.')
      return
    }

    const payload = await response.text()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=43200')
    res.status(200).send(payload)
  } catch (error) {
    res.status(502).send(
      error instanceof Error
        ? `Failed to fetch tide station catalog: ${error.message}`
        : 'Unknown tide station catalog proxy error.',
    )
  }
}
