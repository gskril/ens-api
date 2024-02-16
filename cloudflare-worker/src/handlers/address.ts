import { IRequest } from 'itty-router';
import { z } from 'zod';
import { Address } from 'viem';

import {
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

export async function handleAddress(request: IRequest, env: Env) {
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

  return Response.json(profile);
}
