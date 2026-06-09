const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '20mb' }));

// ─── STORAGE ─────────────────────────────────────────────
let store;
const redisTimeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('Redis timeout')), ms));

if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  store = new Redis(process.env.REDIS_URL, {
    family: 0, // IPv6 + IPv4 — necesario para redis.railway.internal
    connectTimeout: 5000,
    commandTimeout: 4000,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => times > 2 ? null : Math.min(times * 200, 1000)
  });
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

// Helper: ejecuta comando Redis con timeout de seguridad
async function safeGet(key) {
  try {
    return await Promise.race([store.get(key), redisTimeout(4000)]);
  } catch (e) {
    console.error('safeGet error:', e.message);
    return null;
  }
}
async function safeSet(key, value) {
  try {
    await Promise.race([store.set(key, value), redisTimeout(4000)]);
  } catch (e) {
    console.error('safeSet error:', e.message);
  }
}

// ─── RUTAS ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/storage/:key', async (req, res) => {
  const value = await safeGet(req.params.key);
  res.json({ key: req.params.key, value });
});

app.post('/api/storage/:key', async (req, res) => {
  await safeSet(req.params.key, req.body.value);
  res.json({ ok: true });
});

app.post('/api/claude', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada' });
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
    res.json(await response.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🥗 Plan nutricional corriendo en puerto ${PORT}`));
