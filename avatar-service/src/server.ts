import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

const DEFAULT_SIZE = 256;
const IMGPROXY_ORIGIN = 'http://127.0.0.1:8081';
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io';
const MAX_AVATAR_DIMENSION = parseEnvInt('MAX_AVATAR_DIMENSION', 1024);

const LIVE_AVATAR_CACHE_CONTROL =
  'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';
const FALLBACK_AVATAR_CACHE_CONTROL =
  'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';
const NO_STORE = 'no-store';

const defaultAvatar = `
  <svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" fill="url(#paint0_linear_1409_2)"/>
    <defs>
      <linearGradient id="paint0_linear_1409_2" x1="170.517" y1="286.341" x2="-78.3023" y2="-151.616" gradientUnits="userSpaceOnUse">
        <stop stop-color="#44BCF0"/>
        <stop offset="0.378795" stop-color="#7298F8"/>
        <stop offset="1" stop-color="#A099FF"/>
      </linearGradient>
    </defs>
  </svg>
`;

const ethRpc = process.env.ETH_RPC;

if (!ethRpc) {
  console.error('ETH_RPC is required');
  process.exit(1);
}

const client = createPublicClient({
  chain: mainnet,
  transport: http(ethRpc),
});

Bun.serve({
  hostname: '0.0.0.0',
  port: Number(process.env.PORT || '3000'),
  async fetch(request) {
    try {
      return await route(request);
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: 'Internal server error' }, 500, NO_STORE);
    }
  },
});

console.log(`ENS avatar service listening on ${process.env.PORT || '3000'}`);

async function route(request: Request) {
  const url = new URL(request.url);

  if (url.pathname === '/healthz') {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return methodNotAllowed('GET, HEAD');
    }

    return withoutHeadBody(request, jsonResponse({ ok: true }, 200, NO_STORE));
  }

  const match = url.pathname.match(/^\/avatar\/([^/]+)$/);

  if (!match) {
    return jsonResponse({ error: 'Not found' }, 404, NO_STORE);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET, HEAD');
  }

  return withoutHeadBody(request, await handleAvatar(match[1], url));
}

async function handleAvatar(encodedName: string, url: URL) {
  const parsed = parseAvatarRequest(encodedName, url.searchParams);

  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, 400, NO_STORE);
  }

  let ensAvatar: string | null;

  try {
    ensAvatar = await client.getEnsAvatar({
      name: parsed.name,
      assetGatewayUrls: { ipfs: IPFS_GATEWAY },
    });
  } catch (error) {
    console.error('ENS avatar lookup failed', {
      name: parsed.name,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'ENS avatar lookup failed' }, 502, NO_STORE);
  }

  if (!ensAvatar) {
    return fallbackResponse(parsed.fallback);
  }

  const imgproxyUrl = createImgproxyUrl(ensAvatar, parsed.width, parsed.height);

  let transformed: Response;

  try {
    transformed = await fetch(imgproxyUrl, {
      headers: {
        Accept: 'image/webp',
      },
    });
  } catch (error) {
    console.error('imgproxy request failed', {
      name: parsed.name,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackResponse(parsed.fallback);
  }

  if (!isUsableImageResponse(transformed)) {
    console.error('imgproxy returned unusable response', {
      name: parsed.name,
      status: transformed.status,
    });
    return fallbackResponse(parsed.fallback);
  }

  return withCacheControl(transformed, LIVE_AVATAR_CACHE_CONTROL);
}

function parseAvatarRequest(encodedName: string, params: URLSearchParams):
  | {
      ok: true;
      name: `${string}.eth` | string;
      width: number;
      height: number;
      fallback?: string;
    }
  | { ok: false; error: string } {
  let rawName: string;

  try {
    rawName = decodeURIComponent(encodedName);
  } catch {
    return { ok: false, error: 'Invalid ENS name encoding' };
  }

  let name: string;

  try {
    name = normalize(rawName);
  } catch {
    return { ok: false, error: 'Invalid ENS name' };
  }

  const width = parseDimension(params.get('width'), 'width');
  const height = parseDimension(params.get('height'), 'height');

  if (!width.ok) {
    return { ok: false, error: width.error };
  }

  if (!height.ok) {
    return { ok: false, error: height.error };
  }

  const fallback = params.get('fallback') ?? undefined;

  if (fallback && fallback !== 'none' && !isHttpUrl(fallback)) {
    return { ok: false, error: 'fallback must be "none" or an http(s) URL' };
  }

  const requestedWidth = width.value ?? height.value ?? DEFAULT_SIZE;
  const requestedHeight = height.value ?? width.value ?? DEFAULT_SIZE;

  return {
    ok: true,
    name,
    width: requestedWidth,
    height: requestedHeight,
    fallback,
  };
}

function parseDimension(value: string | null, name: 'width' | 'height') {
  if (value === null || value === '') {
    return { ok: true as const, value: undefined };
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return { ok: false as const, error: `${name} must be a positive integer` };
  }

  if (numberValue > MAX_AVATAR_DIMENSION) {
    return {
      ok: false as const,
      error: `${name} must be less than or equal to ${MAX_AVATAR_DIMENSION}`,
    };
  }

  return { ok: true as const, value: numberValue };
}

function createImgproxyUrl(sourceUrl: string, width: number, height: number) {
  const encodedSource = encodeURIComponent(sourceUrl);
  return `${IMGPROXY_ORIGIN}/insecure/resize:fill:${width}:${height}:1/plain/${encodedSource}@webp`;
}

async function fallbackResponse(fallback?: string) {
  if (fallback === 'none') {
    return new Response(null, {
      status: 404,
      headers: responseHeaders({
        'Cache-Control': NO_STORE,
      }),
    });
  }

  if (fallback) {
    try {
      const response = await fetch(fallback);
      return withCacheControl(response, FALLBACK_AVATAR_CACHE_CONTROL);
    } catch (error) {
      console.error('custom fallback request failed', {
        fallback,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return new Response(defaultAvatar, {
    headers: responseHeaders({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': FALLBACK_AVATAR_CACHE_CONTROL,
    }),
  });
}

function withCacheControl(response: Response, cacheControl: string) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', cacheControl);
  headers.set('Access-Control-Allow-Origin', '*');

  if (cacheControl === NO_STORE) {
    headers.delete('ETag');
    headers.delete('Last-Modified');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isUsableImageResponse(response: Response) {
  if (response.status < 200 || response.status >= 400) {
    return false;
  }

  const contentType = response.headers.get('Content-Type');
  return !contentType || contentType.startsWith('image/');
}

function jsonResponse(body: unknown, status: number, cacheControl: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
    }),
  });
}

function methodNotAllowed(allow: string) {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: responseHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': NO_STORE,
      Allow: allow,
    }),
  });
}

function responseHeaders(headers: HeadersInit) {
  const result = new Headers(headers);
  result.set('Access-Control-Allow-Origin', '*');
  return result;
}

function withoutHeadBody(request: Request, response: Response) {
  if (request.method !== 'HEAD') {
    return response;
  }

  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseEnvInt(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    console.warn(`${name} must be a positive integer. Using ${fallback}.`);
    return fallback;
  }

  return numberValue;
}
