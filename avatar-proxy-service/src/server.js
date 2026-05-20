import express from 'express';
import { LRUCache } from 'lru-cache';
import Redis from 'ioredis';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const app = express();

const PORT = Number(process.env.PORT || 3000);
const IMGPROXY_URL = process.env.IMGPROXY_URL || 'http://127.0.0.1:8080';
const ETH_RPC = process.env.ETH_RPC;
const CACHE_TTL_SECONDS = Number(process.env.AVATAR_URL_CACHE_TTL_SECONDS || 3600);
const REDIS_URL = process.env.REDIS_URL;

if (!ETH_RPC) {
  throw new Error('ETH_RPC is required');
}

const client = createPublicClient({ chain: mainnet, transport: http(ETH_RPC) });
const memoryCache = new LRUCache({ max: 5000, ttl: CACHE_TTL_SECONDS * 1000 });
const redis = REDIS_URL ? new Redis(REDIS_URL, { lazyConnect: true }) : null;

async function getCachedAvatarUrl(name) {
  const key = `ens:avatar:url:${name.toLowerCase()}`;
  const inMemory = memoryCache.get(key);

  if (inMemory) return inMemory;

  if (redis) {
    try {
      if (redis.status === 'wait') await redis.connect();
      const cached = await redis.get(key);
      if (cached) {
        memoryCache.set(key, cached);
        return cached;
      }
    } catch {}
  }

  const avatarUrl = await client.getEnsAvatar({ name });
  if (!avatarUrl) return null;

  memoryCache.set(key, avatarUrl);

  if (redis) {
    try {
      await redis.set(key, avatarUrl, 'EX', CACHE_TTL_SECONDS);
    } catch {}
  }

  return avatarUrl;
}

function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

app.get('/healthz', (_, res) => {
  res.status(200).json({ ok: true });
});

app.get('/avatar/:name', async (req, res) => {
  const { name } = req.params;
  const width = Number(req.query.width || 256);
  const height = Number(req.query.height || 256);

  if (!name?.endsWith('.eth')) {
    return res.status(400).json({ error: 'name must be a valid .eth name' });
  }

  if (Number.isNaN(width) || Number.isNaN(height) || width <= 0 || height <= 0) {
    return res.status(400).json({ error: 'width/height must be positive integers' });
  }

  try {
    const avatarUrl = await getCachedAvatarUrl(name);

    if (!avatarUrl) {
      return res.status(404).json({ error: 'no ENS avatar found' });
    }

    const encoded = base64urlEncode(avatarUrl);
    const processing = `rs:fill:${width}:${height}:0/g:sm`;
    const imgproxyPath = `/insecure/${processing}/plain/${encoded}`;
    const upstream = `${IMGPROXY_URL}${imgproxyPath}`;

    const upstreamResponse = await fetch(upstream, {
      headers: {
        accept: req.headers.accept || 'image/*'
      }
    });

    if (!upstreamResponse.ok) {
      const text = await upstreamResponse.text();
      return res.status(upstreamResponse.status).send(text);
    }

    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400');

    const bytes = Buffer.from(await upstreamResponse.arrayBuffer());
    return res.status(200).send(bytes);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'internal error' });
  }
});

app.listen(PORT, () => {
  console.log(`avatar proxy listening on :${PORT}`);
});
