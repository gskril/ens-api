import { createPublicClient, http } from 'viem';
import { IRequest } from 'itty-router';
import { mainnet } from 'viem/chains';
import zod from 'zod';

import { getEnsProfile } from '../functions/profile';
import { getPublicClient } from '../utils';

const commaSeparatedListSchema = (type: 'string' | 'number') => {
  return zod.string().refine((value) => {
    const values = value.split(',');

    if (type === 'string') {
      return values.every((v) => !!v.trim());
    } else {
      return values.every((v) => !isNaN(Number(v)));
    }
  });
};

const addressOrNameSchema = zod.object({
  addressOrName: zod.string().includes('.').or(zod.string().startsWith('0x').length(42)),
});

const keySchema = zod.object({
  texts: commaSeparatedListSchema('string').optional(),
  addresses: commaSeparatedListSchema('number').optional(),
});

export default async function handler(request: IRequest, env: Env): Promise<Response> {
  // Check for an address or name in the path like /profile/0x1234
  const safeAddressOrNameSchema = addressOrNameSchema.safeParse(request.params);
  if (!safeAddressOrNameSchema.success) {
    return Response.json(safeAddressOrNameSchema.error, { status: 400 });
  }
  const { addressOrName } = safeAddressOrNameSchema.data;

  // Check for text or address keys in the query string like /profile/0x1234?textKeys=1,2,3
  const safeKeySchema = keySchema.safeParse(request.query);
  if (!safeKeySchema.success) {
    return Response.json(safeKeySchema.error, { status: 400 });
  }
  let { texts, addresses } = safeKeySchema.data;

  // If no keys were provided, textKeys will be undefined
  // If keys were provided, split them by comma and trim whitespace
  const parsedParams = {
    textKeys: texts?.split(',').map((key) => key.trim()),
    addressKeys: addresses?.split(',').map((key) => key.trim()),
  };

  const client = getPublicClient(env);

  const { data: profile, status } = await getEnsProfile({
    client,
    addressOrName,
    ...parsedParams,
  });

  return Response.json(profile, { status });
}
