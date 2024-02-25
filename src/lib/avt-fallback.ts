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

// return 404 status but still send the fallback avatar
export function fallbackResponse(ctx: ExecutionContext, cache: Cache, cacheKey: Request) {
  const res = new Response(avatar, {
    status: 404,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3000',
    },
  });

  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
