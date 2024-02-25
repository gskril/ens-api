import { IRequest } from 'itty-router';
import { z } from 'zod';

import { fallbackResponse } from '../lib/avt-fallback';
import { checkCache, getPublicClient } from '../lib/utils';

const schema = z.object({
  name: z.string(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
});

export async function handleAvatar(request: IRequest, env: Env, ctx: ExecutionContext) {
  const { cache, cacheKey, response } = await checkCache('avatar', request);

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

  const res = await fetch(ensAvatar, {
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

  if (res.ok || res.redirected) {
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } else {
    return fallbackResponse();
  }
}
