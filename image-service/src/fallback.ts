import {
  FALLBACK_AVATAR_CACHE_CONTROL,
  NO_STORE,
  responseHeaders,
  withCacheControl,
} from './http';

const defaultAvatarFile = Bun.file(new URL('../assets/default-avatar.svg', import.meta.url));

export async function fallbackResponse(fallback?: string) {
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

  return new Response(defaultAvatarFile, {
    headers: responseHeaders({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': FALLBACK_AVATAR_CACHE_CONTROL,
    }),
  });
}
