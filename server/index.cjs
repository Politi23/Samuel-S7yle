const express = require('express');
const { getTasas } = require('./bcv.cjs');

const app = express();
const PORT = 3001;

const ALLOWED_ORIGINS = ['http://localhost:5173'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  next();
});

app.get('/api/bcv/tasas', async (req, res) => {
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
