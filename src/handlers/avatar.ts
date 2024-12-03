import { IRequest } from 'itty-router';
import { z } from 'zod';

import { fallbackResponse } from '../lib/avt-fallback';
import { checkCache, getPublicClient } from '../lib/utils';

const schema = z.object({
  name: z.string(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  fallback: z.string().url().optional(),
});

export async function handleAvatar(request: IRequest, env: Env, ctx: ExecutionContext) {
  const { cache, cacheKey, response } = await checkCache('avatar', request);

  if (response) {
    console.log('returning from cache');
    return response;
  }

  console.log('not cached');
  const params = { ...request.params, ...request.query };
  const safeParse = schema.safeParse(params);

  if (!safeParse.success) {
    return Response.json(safeParse.error, { status: 400 });
  }

  const { name, width, height, fallback } = safeParse.data;
  const client = getPublicClient(env);

  // This occasionally returns null even when a name has an avatar
  // This occasionally times out when the record is a CAIP-22 or CAIP-29 value
  const ensAvatar = await client.getEnsAvatar({
    name,
    assetGatewayUrls: { ipfs: 'https://ipfs.punkscape.xyz' },
  });

  if (!ensAvatar) {
    console.log('no avatar found');
    return fallbackResponse(ctx, cache, cacheKey, fallback);
  }
  console.log('avatar', ensAvatar);

  // Note: Cloudflare sanitizes SVGs by default so we don't need extra checks here
  // https://developers.cloudflare.com/images/transform-images/#sanitized-svgs
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

  // Sometimes OpenSea returns a 304 Not Modified status which is not technically `ok`, but we should still return.
  if ((res.status >= 200 && res.status < 400) || res.redirected) {
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } else {
    console.log({ res: res.status, ok: res.ok });
    return fallbackResponse(ctx, cache, cacheKey, fallback);
  }
}
