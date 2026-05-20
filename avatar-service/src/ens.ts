import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io';
const ethRpc = process.env.ETH_RPC;

if (!ethRpc) {
  console.error('ETH_RPC is required');
  process.exit(1);
}

const client = createPublicClient({
  chain: mainnet,
  transport: http(ethRpc),
});

export function normalizeEnsName(name: string) {
  return normalize(name);
}

export async function resolveEnsAvatar(name: string) {
  return client.getEnsAvatar({
    name,
    assetGatewayUrls: { ipfs: IPFS_GATEWAY },
  });
}
