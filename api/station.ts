import type { VercelRequest, VercelResponse } from '@vercel/node'

const NOAA_BASE_URL = 'https://www.ndbc.noaa.gov/data/realtime2'

function isValidStationId(stationId: string): boolean {
  return /^\d{5}$/.test(stationId)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const stationId = String(req.query.stationId ?? '')

  if (!isValidStationId(stationId)) {
    res.status(400).send('Invalid station ID.')
    return
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(`${NOAA_BASE_URL}/${stationId}.txt`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      res.status(response.status).send('NOAA request failed.')
      return
    }

    const rawText = await response.text()
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300')
    res.status(200).send(rawText)
  } catch (error) {
    res.status(502).send(
      error instanceof Error ? `Failed to fetch station data: ${error.message}` : 'Unknown proxy error.',
    )
  }
}
