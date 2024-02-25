import { IRequest } from 'itty-router';
import { z } from 'zod';
import { Address } from 'viem';

import {
  cacheAndCreateResponse,
  commaSeparatedListSchema,
  getPublicClient,
  parseKeysFromParams,
} from '../lib/utils';
import { fetchProfile } from '../lib/fetchProfile';

const schema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  texts: commaSeparatedListSchema('string').optional(),
  coins: commaSeparatedListSchema('number').optional(),
});

export async function handleAddress(request: IRequest, env: Env, ctx: ExecutionContext) {
  // Construct the cache key
  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = await caches.open('address');

  // Check whether the value is already available in the cache
  let response = await cache.match(cacheKey);

  if (response) {
    return response;
  }

  const safeParse = schema.safeParse({ ...request.params, ...request.query });

  if (!safeParse.success) {
    return Response.json(safeParse.error, { status: 400 });
  }

  const params = safeParse.data;
  const address = params.address as Address;

  const client = getPublicClient(env);
  const name = await client.getEnsName({ address });

  if (!name) {
    return new Response('No ENS name found for this address', { status: 404 });
  }

  const { textKeys, coinKeys } = parseKeysFromParams(params);

  const profile = await fetchProfile({
    name,
    textKeys,
    coinKeys,
    env,
    request,
  });

  return cacheAndCreateResponse(ctx, cache, cacheKey, profile);
}
