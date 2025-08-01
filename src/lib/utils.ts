import { addEnsContracts, ensPublicActions } from '@ensdomains/ensjs';
import { createPublicClient, http, sha256 } from 'viem';
import { mainnet } from 'viem/chains';
import { z } from 'zod';

import { defaultCoinKeys, defaultTextKeys } from './constants';
import { IRequest } from 'itty-router/types';

export function getPublicClient(env: Env) {
  return createPublicClient({
    transport: http(env.ETH_RPC),
    chain: addEnsContracts(mainnet),
    batch: {
      multicall: {
        batchSize: 10_240,
      },
    },
  }).extend(ensPublicActions);
}

export const commaSeparatedListSchema = (type: 'string' | 'number') => {
  return z.string().refine((value) => {
    const values = value.split(',');

    if (type === 'string') {
      return values.every((v) => !!v.trim());
    } else {
      return values.every((v) => !isNaN(Number(v)));
    }
  });
};

export function parseKeysFromParams({
  texts,
  coins,
}: {
  texts?: string | undefined;
  coins?: string | undefined;
}) {
  const requestedTextKeys = texts?.split(',').map((key) => key.trim()) || [];
  const requestedCoinKeys = coins?.split(',').map((key) => Number(key)) || [];

  const textKeys = defaultTextKeys.concat(requestedTextKeys);
  const coinKeys = defaultCoinKeys.concat(requestedCoinKeys);

  return { textKeys, coinKeys };
}

export async function checkCache(key: string, request: IRequest, body?: unknown) {
  const bodyHash = sha256(new TextEncoder().encode(JSON.stringify(body)));

  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = cacheUrl.pathname + bodyHash;

  // Always use GET method to enable caching
  const cacheKey = new Request(cacheUrl, { method: 'GET', headers: request.headers });
  const cache = await caches.open(key);

  // Check whether the value is already available in the cache
  const response = await cache.match(cacheKey);

  return { cache, cacheKey, response };
}

export function cacheAndCreateResponse(
  ctx: ExecutionContext,
  cache: Cache,
  cacheKey: Request,
  data: any
) {
  const response = Response.json(data);

  // Cache the response for 10 minutes. If the same data is requested witin the
  // next 50 mins, serve the stale response while revalidating in the background
  response.headers.append(
    'Cache-Control',
    'public, max-age=600, stale-while-revalidate=3000'
  );

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
