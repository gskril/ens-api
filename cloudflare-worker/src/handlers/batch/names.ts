import { IRequest } from 'itty-router';
import { normalize } from 'viem/ens';
import { z } from 'zod';

import { getPublicClient } from '../../lib/utils';
import { batch, getAddressRecord } from '@ensdomains/ensjs/public';

const schema = z.object({
  names: z
    .array(
      z.string().refine((name) => name.includes('.'), {
        message: 'Name must include a "."',
      })
    )
    .max(100),
  coinType: z.number().optional().default(60),
});

export async function handleNames(request: IRequest, env: Env) {
  const body = await request.json().catch(() => ({}));
  const safeSchema = schema.safeParse(body);

  if (!safeSchema.success) {
    return Response.json(safeSchema.error, { status: 400 });
  }

  const { names, coinType } = safeSchema.data;
  const client = getPublicClient(env);

  console.log(coinType);

  const normalizedNames = names.map((name) => {
    try {
      return normalize(name);
    } catch {
      return '';
    }
  });

  const res = await batch(
    client,
    ...normalizedNames.map((name) => getAddressRecord.batch({ name, coin: coinType }))
  );

  const addresses = res.map((obj) => obj?.value || null);
  return Response.json(addresses);
}
