import { normalizeEnsName, resolveEnsAvatar } from './ens';
import { parseEnvInt } from './env';
import { fallbackResponse } from './fallback';
import { transformAvatarImage } from './imgproxy';
import {
  jsonResponse,
  LIVE_AVATAR_CACHE_CONTROL,
  methodNotAllowed,
  NO_STORE,
  withCacheControl,
  withoutHeadBody,
} from './http';

const DEFAULT_SIZE = 256;
const MAX_AVATAR_DIMENSION = parseEnvInt('MAX_AVATAR_DIMENSION', 1024);

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
    ensAvatar = await resolveEnsAvatar(parsed.name);
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

  let transformed: Response;

  try {
    const response = await transformAvatarImage(ensAvatar, parsed.width, parsed.height);

    if (!response) {
      console.error('imgproxy returned unusable response', { name: parsed.name });
      return fallbackResponse(parsed.fallback);
    }

    transformed = response;
  } catch (error) {
    console.error('imgproxy request failed', {
      name: parsed.name,
      error: error instanceof Error ? error.message : String(error),
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
    name = normalizeEnsName(rawName);
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

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
