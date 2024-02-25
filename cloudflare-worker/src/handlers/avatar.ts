import { IRequest } from 'itty-router';
import { z } from 'zod';

import { fallbackResponse } from '../lib/avt-fallback';
import { cacheAndCreateResponse, getPublicClient } from '../lib/utils';

const schema = z.object({
  name: z.string(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
});

export async function handleAvatar(request: IRequest, env: Env, ctx: ExecutionContext) {
  // Construct the cache key
  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = await caches.open('avatar');

  // Check whether the value is already available in the cache
  let response = await cache.match(cacheKey);

  if (response) {
    return response;
  }

  const params = { ...request.params, ...request.query };
  const safeParse = schema.safeParse(params);

  if (!safeParse.success) {
    return Response.json(safeParse.error, { status: 400 });
  }

  const { name, width, height } = safeParse.data;

  const client = getPublicClient(env);
  const ensAvatar = await client.getEnsAvatar({ name });

  if (!ensAvatar) {
    return fallbackResponse();
  }

  response = await fetch(ensAvatar, {
    headers: request.headers,
    cf: {
      cacheTtl: 3600,
      cacheEverything: true,
      image: {
        width: width || height || 256,
        height: height || width || 256,
        fit: 'cover',
      },
    },
  });

  if (response.ok || response.redirected) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } else {
    return fallbackResponse();
  }
}
