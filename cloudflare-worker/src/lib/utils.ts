import { addEnsContracts, ensPublicActions } from '@ensdomains/ensjs';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { z } from 'zod';

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
