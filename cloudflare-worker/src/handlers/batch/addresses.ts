import { Address, PublicClient } from 'viem';
import { IRequest } from 'itty-router';
import { normalize } from 'viem/ens';
import zod from 'zod';

import { getPublicClient } from '../../lib/utils';

const schema = zod.object({
  addresses: zod.array(zod.string().regex(/^0x[a-fA-F0-9]{40}$/)).max(100),
});

export default async function handler(request: IRequest, env: Env): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const safeSchema = schema.safeParse(body);

  if (!safeSchema.success) {
    return Response.json(safeSchema.error, { status: 400 });
  }

  const { addresses } = safeSchema.data;
  const client = getPublicClient(env);

  const names = await getNamesFromAddresses(client, addresses);
  return Response.json(names, { status: 200 });
}

async function getNamesFromAddresses(client: PublicClient, addresses: string[]) {
  // These will be batched into a single multicall
  const asyncCalls = addresses.map((address) =>
    client.getEnsName({ address: address as Address })
  );

  const names = await Promise.all(asyncCalls);
  const normalizedNames = names.map((name) => {
    if (!name) return null;

    try {
      return normalize(name);
    } catch (error) {
      return null;
    }
  });

  return normalizedNames;
}
