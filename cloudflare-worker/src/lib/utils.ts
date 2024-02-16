import { addEnsContracts, ensPublicActions } from '@ensdomains/ensjs';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { z } from 'zod';

import { defaultCoinKeys, defaultTextKeys } from './constants';

export function getPublicClient(env: Env) {
  return createPublicClient({
    transport: http(env.ETH_RPC),
    chain: addEnsContracts(mainnet),
    batch: {
      multicall: {
        batchSize: 10_240,
      },
    },
  }).extend(ensPublicActions);
}

export const commaSeparatedListSchema = (type: 'string' | 'number') => {
  return z.string().refine((value) => {
    const values = value.split(',');

    if (type === 'string') {
      return values.every((v) => !!v.trim());
    } else {
      return values.every((v) => !isNaN(Number(v)));
    }
  });
};

export function parseKeysFromParams({
  texts,
  coins,
}: {
  texts?: string | undefined;
  coins?: string | undefined;
}) {
  const requestedTextKeys = texts?.split(',').map((key) => key.trim()) || [];
  const requestedCoinKeys = coins?.split(',').map((key) => Number(key)) || [];

  const textKeys = defaultTextKeys.concat(requestedTextKeys);
  const coinKeys = defaultCoinKeys.concat(requestedCoinKeys);

  return { textKeys, coinKeys };
}
