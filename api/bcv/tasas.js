import https from 'https'

let cache = null
const CACHE_TTL_MS = 60 * 60 * 1000

function fetchBCVPage() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.bcv.org.ve',
      path: '/',
      method: 'GET',
      rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-VE,es;q=0.9',
        'Cache-Control': 'no-cache',
      },
      timeout: 12000,
    }

    const req = https.request(options, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('BCV timeout')) })
    req.end()
  })
}

function parseRate(html, currencyId) {
  const idx = html.indexOf(`id="${currencyId}"`)
  if (idx < 0) return null
  const section = html.slice(idx, idx + 600)
  const m = section.match(/<strong[^>]*>\s*([\d,.]+)\s*<\/strong>/)
  if (!m) return null
  return parseFloat(m[1].trim().replace(/\./g, '').replace(',', '.'))
}

function parseFechaValor(html) {
  const m = html.match(/Fecha\s+Valor\s*:\s*(?:<[^>]+>)?\s*([^<\n]{5,60})/i)
  return m ? m[1].trim() : null
}

async function getTasas(force = false) {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { ...cache.data, cached: true }
  }

  const html = await fetchBCVPage()
  const eur = parseRate(html, 'euro')
  const usd = parseRate(html, 'dolar')
  const fecha = parseFechaValor(html)

  if (!eur && !usd) {
    if (cache) return { ...cache.data, cached: true, stale: true }
    throw new Error('No se pudo leer la tasa del BCV')
  }

  const data = { eur, usd, fecha, fetchedAt: new Date().toISOString() }
  cache = { data, fetchedAt: Date.now() }
  return { ...data, cached: false }
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim())
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  try {
    const force = req.query?.force === '1'
    const data = await getTasas(force)
    res.status(200).json(data)
  } catch (err) {
    console.error('[BCV]', err.message)
    res.status(502).json({ error: 'No se pudo conectar con el BCV' })
  }
}
