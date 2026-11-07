import type { VercelRequest, VercelResponse } from '@vercel/node'

const TIDE_DATA_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'

function isValidStationId(stationId: string): boolean {
  return /^[a-z0-9]{5,8}$/i.test(stationId)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const stationId = String(req.query.stationId ?? '')
  const range = String(req.query.range ?? 'latest').toLowerCase()

  if (!isValidStationId(stationId)) {
    res.status(400).send('Invalid tide station ID.')
    return
  }
  if (range !== 'latest' && range !== 'recent') {
    res.status(400).send('Invalid tide range.')
    return
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const query = new URLSearchParams({
      product: 'predictions',
      date: range,
      datum: 'MLLW',
      time_zone: 'gmt',
      units: 'english',
      interval: '6',
      format: 'json',
      station: stationId,
    })

    const response = await fetch(`${TIDE_DATA_BASE_URL}?${query.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      res.status(response.status).send('NOAA tide request failed.')
      return
    }

    const payload = await response.text()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300')
    res.status(200).send(payload)
  } catch (error) {
    res.status(502).send(
      error instanceof Error ? `Failed to fetch tide data: ${error.message}` : 'Unknown proxy error.',
    )
  }
}
