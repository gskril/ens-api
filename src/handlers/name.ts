import { IRequest } from 'itty-router';
import { z } from 'zod';

import {
  cacheAndCreateResponse,
  checkCache,
  commaSeparatedListSchema,
  parseKeysFromParams,
} from '../lib/utils';
import { fetchProfile } from '../lib/fetchProfile';

const schema = z.object({
  name: z.string(),
  texts: commaSeparatedListSchema('string').optional(),
  coins: commaSeparatedListSchema('number').optional(),
});

export async function handleName(request: IRequest, env: Env, ctx: ExecutionContext) {
  const { cache, cacheKey, response } = await checkCache('name', request);

  if (response) {
    return new Response(response.body, response);
  }

  const safeParse = schema.safeParse({ ...request.params, ...request.query });

  if (!safeParse.success) {
    return Response.json(safeParse.error, { status: 400 });
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

  return cacheAndCreateResponse(ctx, cache, cacheKey, profile);
}
