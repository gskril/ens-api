export const LIVE_AVATAR_CACHE_CONTROL =
  'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';
export const FALLBACK_AVATAR_CACHE_CONTROL =
  'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';
export const NO_STORE = 'no-store';

export function jsonResponse(body: unknown, status: number, cacheControl: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
    }),
  });
}

export function methodNotAllowed(allow: string) {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: responseHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': NO_STORE,
      Allow: allow,
    }),
  });
}

export function responseHeaders(headers: HeadersInit) {
  const result = new Headers(headers);
  result.set('Access-Control-Allow-Origin', '*');
  return result;
}

export function withCacheControl(response: Response, cacheControl: string) {
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

export function withoutHeadBody(request: Request, response: Response) {
  if (request.method !== 'HEAD') {
    return response;
  }

  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
