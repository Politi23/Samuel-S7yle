const express = require('express');
const { getTasas } = require('./bcv.cjs');

const app = express();
const PORT = 3001;

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',').map(s => s.trim());

// ── Rate limiter simple (sin dependencias) ───────────────────────────────────
const rateMap = new Map();
function rateLimit(windowMs, max) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = rateMap.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
    entry.count++;
    rateMap.set(key, entry);
    if (entry.count > max) return res.status(429).json({ error: 'Too many requests' });
    next();
  };
}

// ── Middleware global ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.get('/api/bcv/tasas', rateLimit(60 * 1000, 30), async (req, res) => {
  try {
    const force = req.query.force === '1';
    const data = await getTasas(force);
    res.json(data);
  } catch (err) {
    console.error('[BCV]', err.message);
    res.status(502).json({ error: 'No se pudo conectar con el BCV' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor BCV corriendo en http://localhost:${PORT}`);
});
