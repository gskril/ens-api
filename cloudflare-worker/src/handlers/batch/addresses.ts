import { Address } from 'viem';
import { batch, getName } from '@ensdomains/ensjs/public';
import { IRequest } from 'itty-router';
import { normalize } from 'viem/ens';
import zod from 'zod';

import { getPublicClient } from '../../lib/utils';

const schema = zod.object({
  addresses: zod.array(zod.string().regex(/^0x[a-fA-F0-9]{40}$/)).max(100),
});

export async function handleAddresses(request: IRequest, env: Env) {
  const body = await request.json().catch(() => ({}));
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

  return Response.json(names);
}
