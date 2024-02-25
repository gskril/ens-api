import { Address, sha256 } from 'viem';
import { batch, getName } from '@ensdomains/ensjs/public';
import { IRequest } from 'itty-router';
import { normalize } from 'viem/ens';
import zod from 'zod';

import { cacheAndCreateResponse, getPublicClient } from '../../lib/utils';

const schema = zod.object({
  addresses: zod.array(zod.string().regex(/^0x[a-fA-F0-9]{40}$/)).max(100),
});

export async function handleAddresses(
  request: IRequest,
  env: Env,
  ctx: ExecutionContext
) {
  const body = await request.json().catch(() => ({}));

  // Construct the cache key
  const cacheUrl = new URL(request.url);
  const bodyHash = sha256(new TextEncoder().encode(JSON.stringify(body)));
  cacheUrl.pathname = cacheUrl.pathname + bodyHash;
  const cacheKey = new Request(cacheUrl, { method: 'GET', headers: request.headers }); // Convert to a GET to be able to cache
  const cache = await caches.open('addresses');

  // Check whether the value is already available in the cache
  let response = await cache.match(cacheKey);

  if (response) {
    return response;
  }

  const safeParse = schema.safeParse(body);

  if (!safeParse.success) {
    return Response.json(safeParse.error, { status: 400 });
  }

  const params = safeParse.data;
  const addresses = params.addresses as Address[];
  const client = getPublicClient(env);

  const res = await batch(
    client,
    ...addresses.map((address) => getName.batch({ address }))
  );

  const names = res.map((obj) => {
    if (!obj || !obj.match) return null;

    try {
      return normalize(obj.name);
    } catch (error) {
      return null;
    }
  });

  return cacheAndCreateResponse(ctx, cache, cacheKey, names);
}
