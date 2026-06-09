const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '20mb' })); // Necesario para imágenes en base64

// ─── STORAGE ─────────────────────────────────────────────
// Usa Redis si hay REDIS_URL, si no guarda en memoria (se pierde al reiniciar)
let store;

if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  store = new Redis(process.env.REDIS_URL, { tls: { rejectUnauthorized: false } });
  store.on('connect', () => console.log('✅ Redis conectado'));
  store.on('error', (e) => console.error('Redis error:', e.message));
} else {
  console.log('⚠️  Sin REDIS_URL — usando almacenamiento en memoria');
  const map = new Map();
  store = {
    get: async (k) => map.get(k) ?? null,
    set: async (k, v) => { map.set(k, v); return 'OK'; }
  };
}

// ─── RUTAS ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// GET storage
app.get('/api/storage/:key', async (req, res) => {
  try {
    const value = await store.get(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SET storage
app.post('/api/storage/:key', async (req, res) => {
  try {
    const { value } = req.body;
    await store.set(req.params.key, value);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Proxy a Claude API (la API key queda en el servidor, nunca en el frontend)
app.post('/api/claude', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Railway' });
  }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── START ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🥗 Plan nutricional corriendo en puerto ${PORT}`));
