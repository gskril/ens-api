import { createPublicClient, http } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';
import { z } from 'zod';

export const networkSchema = z.enum(['mainnet', 'sepolia']);
type Network = z.infer<typeof networkSchema>;

const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://dweb.link';
const mainnetRpc = process.env.MAINNET_RPC;
const sepoliaRpc = process.env.SEPOLIA_RPC;

if (!mainnetRpc) {
  console.error('MAINNET_RPC is required');
  process.exit(1);
}

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(mainnetRpc),
});

const sepoliaClient = sepoliaRpc
  ? createPublicClient({
      chain: sepolia,
      transport: http(sepoliaRpc),
    })
  : null;

export function normalizeEnsName(name: string) {
  return normalize(name);
}

export async function resolveEnsAvatar(network: Network, name: string) {
  const client = getClient(network);

  return client.getEnsAvatar({
    name,
    assetGatewayUrls: { ipfs: IPFS_GATEWAY },
  });
}

function getClient(network: Network) {
  if (network === 'mainnet') {
    return mainnetClient;
  }

  if (!sepoliaClient) {
    throw new Error('SEPOLIA_RPC is required for sepolia avatar lookups');
  }

  return sepoliaClient;
}
