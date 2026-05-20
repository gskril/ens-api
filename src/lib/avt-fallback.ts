const avatar = `
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

export const LIVE_AVATAR_CACHE_CONTROL =
  'public, max-age=86400, stale-while-revalidate=604800';

export const FALLBACK_AVATAR_CACHE_CONTROL =
  'public, max-age=3600, stale-while-revalidate=86400';

export function withCacheControl(response: Response, cacheControl: string) {
  const res = new Response(response.body, response);
  res.headers.set('Cache-Control', cacheControl);
  return res;
}

export function cacheAvatarResponse(
  ctx: ExecutionContext,
  cache: Cache,
  cacheKey: Request,
  response: Response
) {
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export async function fallbackResponse(
  ctx: ExecutionContext,
  cache: Cache,
  cacheKey: Request,
  fallback?: string
) {
  let res: Response;

  if (fallback === 'none') {
    return new Response(null, {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } else if (fallback) {
    res = await fetch(fallback);
    res = withCacheControl(res, FALLBACK_AVATAR_CACHE_CONTROL);
  } else {
    res = new Response(avatar, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': FALLBACK_AVATAR_CACHE_CONTROL,
      },
    });
  }

  return cacheAvatarResponse(ctx, cache, cacheKey, res);
}
