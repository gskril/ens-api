import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

export function getPublicClient(env: Env) {
  return createPublicClient({
    transport: http(env.ETH_RPC),
    chain: mainnet,
    batch: {
      multicall: {
        batchSize: 10_240,
      },
    },
  });
}
