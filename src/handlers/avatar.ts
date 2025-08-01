import { IRequest } from 'itty-router';
import { z } from 'zod';

import { fallbackResponse } from '../lib/avt-fallback';
import { checkCache, getPublicClient } from '../lib/utils';
import { parseAvatarRecord } from 'viem/ens';

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

  const textRecord = await client.getEnsText({
    name,
    key: 'avatar',
  });

  if (!textRecord) {
    console.log('no avatar found');
    return fallbackResponse(ctx, cache, cacheKey, fallback);
  }

  const avatarUrl = await parseAvatarRecord(client, {
    record: textRecord,
    gatewayUrls: { ipfs: 'https://ipfs.punkscape.xyz' },
  });

  const imgRes = await fetch(avatarUrl);
  const contentType = imgRes.headers.get('content-type');

  console.log({ textRecord, avatarUrl });

  // Note: Cloudflare sanitizes SVGs by default so we don't need extra checks here
  // https://developers.cloudflare.com/images/transform-images/#sanitized-svgs
  const res = await fetch(avatarUrl, {
    headers: {
      ...request.headers,
      'X-API-KEY': avatarUrl.includes('.seadn.io') ? env.OPENSEA_API_KEY : '',
      'Content-Type': contentType || 'image/svg+xml',
    },
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
    console.log('failed res', res);
    return fallbackResponse(ctx, cache, cacheKey, fallback);
  }
}
