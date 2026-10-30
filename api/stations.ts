import type { VercelRequest, VercelResponse } from '@vercel/node'

const ACTIVE_STATIONS_URL = 'https://www.ndbc.noaa.gov/activestations.xml'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(ACTIVE_STATIONS_URL, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      res.status(response.status).send('NOAA station catalog request failed.')
      return
    }

    const rawXml = await response.text()
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600')
    res.status(200).send(rawXml)
  } catch (error) {
    res.status(502).send(
      error instanceof Error
        ? `Failed to fetch station catalog: ${error.message}`
        : 'Unknown station catalog proxy error.',
    )
  }
}
