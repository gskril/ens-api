import { IRequest } from 'itty-router';
import { z } from 'zod';
import { commaSeparatedListSchema, getPublicClient } from '../lib/utils';
import { getRecords } from '@ensdomains/ensjs/public';
import { normalize } from 'viem/ens';

import { defaultCoinKeys, defaultTextKeys } from '../lib/constants';

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
  const client = getPublicClient(env);
  const name = normalize(params.name);

  const requestedTextKeys = params.texts?.split(',').map((key) => key.trim()) || [];
  const requestedCoinKeys = params.coins?.split(',').map((key) => Number(key)) || [];

  const profile = await getRecords(client, {
    name: name,
    texts: defaultTextKeys.concat(requestedTextKeys),
    coins: defaultCoinKeys.concat(requestedCoinKeys),
    contentHash: false,
  });

  const texts = profile.texts
    .map((text) => ({ [text.key]: text.value }))
    .reduce((a, b) => ({ ...a, ...b }), {});

  const coins = profile.coins
    .map((coin) => ({
      [coin.id]: {
        name: coin.name,
        address: coin.value,
      },
    }))
    .reduce((a, b) => ({ ...a, ...b }), {});

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const avatar = texts.avatar && {
    xs: `${baseUrl}/avatar/${name}?width=64`,
    sm: `${baseUrl}/avatar/${name}?width=128`,
    md: `${baseUrl}/avatar/${name}?width=256`,
    lg: `${baseUrl}/avatar/${name}=width=512`,
  };

  return Response.json({
    name,
    address: coins[60].address,
    avatar,
    texts,
    coins,
  });
}
