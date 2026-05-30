let cache = null
const CACHE_TTL_MS = 60 * 60 * 1000

async function getTasasFromDolarApi() {
  const [resUsd, resEur] = await Promise.all([
    fetch('https://ve.dolarapi.com/v1/dolares', { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) }),
    fetch('https://ve.dolarapi.com/v1/euros',   { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) }),
  ])
  if (!resUsd.ok) throw new Error(`dolarapi USD status ${resUsd.status}`)
  const dataUsd = await resUsd.json()
  const dataEur = resEur.ok ? await resEur.json() : []
  const usdItem = dataUsd.find(d => d.moneda === 'USD' && d.fuente === 'oficial')
  const eurItem = dataEur.find(d => d.moneda === 'EUR' && d.fuente === 'oficial')
  const usd = usdItem?.promedio ?? null
  const eur = eurItem?.promedio ?? null
  if (!usd && !eur) throw new Error('dolarapi: no se encontraron tasas')
  return { usd, eur, fecha: (eurItem ?? usdItem)?.fechaActualizacion?.slice(0, 10) ?? null }
}

async function getTasasFromBCV() {
  const { default: https } = await import('https')
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.bcv.org.ve',
      path: '/',
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'es-VE,es;q=0.9',
      },
      timeout: 12000,
    }
    const req = https.request(options, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf8')
        const parseRate = (id) => {
          const idx = html.indexOf(`id="${id}"`)
          if (idx < 0) return null
          const m = html.slice(idx, idx + 600).match(/<strong[^>]*>\s*([\d,.]+)\s*<\/strong>/)
          return m ? parseFloat(m[1].trim().replace(/\./g, '').replace(',', '.')) : null
        }
        const eur = parseRate('euro')
        const usd = parseRate('dolar')
        if (!eur && !usd) return reject(new Error('BCV: no se encontraron tasas'))
        const mFecha = html.match(/Fecha\s+Valor\s*:\s*(?:<[^>]+>)?\s*([^<\n]{5,60})/i)
        resolve({ usd, eur, fecha: mFecha ? mFecha[1].trim() : null })
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('BCV timeout')) })
    req.end()
  })
}

async function getTasas(force = false) {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { ...cache.data, cached: true }
  }

  let data
  try {
    data = await getTasasFromDolarApi()
  } catch (e1) {
    console.warn('[BCV] dolarapi falló, intentando BCV directo:', e1.message)
    try {
      data = await getTasasFromBCV()
    } catch (e2) {
      if (cache) return { ...cache.data, cached: true, stale: true }
      throw new Error('No se pudo obtener la tasa de cambio')
    }
  }

  const result = { ...data, fetchedAt: new Date().toISOString() }
  cache = { data: result, fetchedAt: Date.now() }
  return { ...result, cached: false }
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  try {
    const force = req.query?.force === '1'
    const data = await getTasas(force)
    res.status(200).json(data)
  } catch (err) {
    console.error('[BCV]', err.message)
    res.status(502).json({ error: 'No se pudo obtener la tasa de cambio' })
  }
}
