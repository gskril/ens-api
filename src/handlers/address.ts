import { IRequest } from 'itty-router';
import { z } from 'zod';
import { Address, toCoinType } from 'viem';

import {
  cacheAndCreateResponse,
  checkCache,
  commaSeparatedListSchema,
  getPublicClient,
  parseKeysFromParams,
  safeCoinType,
} from '../lib/utils';
import { fetchProfile } from '../lib/fetchProfile';

const schema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  texts: commaSeparatedListSchema('string').optional(),
  coins: commaSeparatedListSchema('number').optional(),
  // This can be an EVM chain id or cointype for convenience
  chain: z.coerce.number().optional().default(1),
});

export async function handleAddress(request: IRequest, env: Env, ctx: ExecutionContext) {
  const { cache, cacheKey, response } = await checkCache('address', request);

  if (response) {
    return new Response(response.body, response);
  }

  const safeParse = schema.safeParse({ ...request.params, ...request.query });

  if (!safeParse.success) {
    return Response.json(safeParse.error, { status: 400 });
  }

  const params = safeParse.data;
  const address = params.address as Address;

  const client = getPublicClient(env);
  const coinType = safeCoinType(params.chain);
  const name = await client.getEnsName({ address, coinType });

  if (!name) {
    return new Response('No ENS name found for this address', { status: 404 });
  }

  const { textKeys, coinKeys } = parseKeysFromParams(params);

  // Assume that if we're getting a L2 reverse record, the dev also wants the forward address for that chain
  coinKeys.push(Number(coinType));

  const profile = await fetchProfile({
    name,
    textKeys,
    coinKeys: Array.from(new Set(coinKeys)),
    env,
    request,
  });

  return cacheAndCreateResponse(ctx, cache, cacheKey, profile);
}
