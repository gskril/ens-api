import { IRequest } from 'itty-router';
import { normalize } from 'viem/ens';
import { PublicClient } from 'viem';
import zod from 'zod';

import { getPublicClient } from '../../utils';

const schema = zod.object({
  names: zod
    .array(
      zod.string().refine((name) => name.includes('.'), {
        message: 'Name must include a "."',
      })
    )
    .max(100),
});

export default async function handler(request: IRequest, env: Env): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const safeSchema = schema.safeParse(body);

  if (!safeSchema.success) {
    return Response.json(safeSchema.error, { status: 400 });
  }

  const { names } = safeSchema.data;
  const client = getPublicClient(env);

  const addresses = await getAddressesFromNames(client, names);
  return Response.json(addresses, { status: 200 });
}

async function getAddressesFromNames(client: PublicClient, names: string[]) {
  const normalizedNames = names.map((name) => {
    try {
      return normalize(name);
    } catch (error) {
      return null;
    }
  });

  // These will be batched into a single multicall
  const asyncCalls = normalizedNames.map((name) => {
    if (!name) {
      return null;
    }

    return client.getEnsAddress({ name });
  });

  const addresses = await Promise.all(asyncCalls);
  return addresses;
}
