import { IRequest } from 'itty-router';
import { z } from 'zod';

import { commaSeparatedListSchema, parseKeysFromParams } from '../lib/utils';
import { fetchProfile } from '../lib/fetchProfile';

const schema = z.object({
  name: z.string(),
  texts: commaSeparatedListSchema('string').optional(),
  coins: commaSeparatedListSchema('number').optional(),
});

export async function handleName(request: IRequest, env: Env) {
  const safeParse = schema.safeParse({ ...request.params, ...request.query });

  if (!safeParse.success) {
    return new Response('Invalid request', { status: 400 });
  }

  const params = safeParse.data;
  const { textKeys, coinKeys } = parseKeysFromParams(params);

  const profile = await fetchProfile({
    name: params.name,
    textKeys,
    coinKeys,
    request,
    env,
  });

  return Response.json(profile);
}
