import { IRequest } from 'itty-router';
import { normalize } from 'viem/ens';
import { z } from 'zod';

import { cacheAndCreateResponse, getPublicClient } from '../../lib/utils';
import { batch, getAddressRecord } from '@ensdomains/ensjs/public';
import { sha256 } from 'viem/utils';

const schema = z.object({
  names: z
    .array(
      z.string().refine((name) => name.includes('.'), {
        message: 'Name must include a "."',
      })
    )
    .max(100),
  coinType: z.number().optional().default(60),
});

export async function handleNames(request: IRequest, env: Env, ctx: ExecutionContext) {
  const body = await request.json().catch(() => ({}));

  // Construct the cache key
  const cacheUrl = new URL(request.url);
  const bodyHash = sha256(new TextEncoder().encode(JSON.stringify(body)));
  cacheUrl.pathname = cacheUrl.pathname + bodyHash;
  const cacheKey = new Request(cacheUrl, { method: 'GET', headers: request.headers }); // Convert to a GET to be able to cache
  const cache = await caches.open('names');

  // Check whether the value is already available in the cache
  let response = await cache.match(cacheKey);

  if (response) {
    return response;
  }

  const safeSchema = schema.safeParse(body);

  if (!safeSchema.success) {
    return Response.json(safeSchema.error, { status: 400 });
  }

  const { names, coinType } = safeSchema.data;
  const client = getPublicClient(env);

  console.log(coinType);

  const normalizedNames = names.map((name) => {
    try {
      return normalize(name);
    } catch {
      return '';
    }
  });

  const res = await batch(
    client,
    ...normalizedNames.map((name) => getAddressRecord.batch({ name, coin: coinType }))
  );

  const addresses = res.map((obj) => obj?.value || null);
  return cacheAndCreateResponse(ctx, cache, cacheKey, addresses);
}
