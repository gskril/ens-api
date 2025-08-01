import { readContract } from 'viem/actions';

import {
  Address,
  Chain,
  Client,
  EnsAvatarInvalidNftUriError,
  EnsAvatarUnsupportedNamespaceError,
  Transport,
} from 'viem';
import { parseAvatarRecord as viemParseAvatarRecord } from 'viem/ens';

// Viem has this internally, but we need to add headers to some API requests so have to re-implement it by hand
export async function parseAvatarRecord(
  client: Client<Transport, any>,
  record: string | null
): Promise<string | null> {
  const url = await viemParseAvatarRecord(client, {
    record: record || '',
    gatewayUrls: {
      ipfs: 'https://cloudflare-ipfs.com/ipfs/',
      arweave: 'https://arweave.net/',
    },
  });
  console.log('url', url);
  return url;

  //   if (!record) return null;

  //   if (/eip155:/i.test(record)) {
  //     const nft = parseNftUri(record);
  //     const nftUri = await getNftTokenUri(client, { nft });
  //     return nftUri;
  //   }

  //   // TODO: parse NFT URI, IPFS, etc.

  //   return record;
  // }

  // type ParsedNft = {
  //   chainID: number;
  //   namespace: string;
  //   contractAddress: Address;
  //   tokenID: string;
  // };

  // function parseNftUri(uri_: string): ParsedNft {
  //   let uri = uri_;
  //   // parse valid nft spec (CAIP-22/CAIP-29)
  //   // @see: https://github.com/ChainAgnostic/CAIPs/tree/master/CAIPs
  //   if (uri.startsWith('did:nft:')) {
  //     // convert DID to CAIP
  //     uri = uri.replace('did:nft:', '').replace(/_/g, '/');
  //   }

  //   const [reference, asset_namespace, tokenID] = uri.split('/');
  //   const [eip_namespace, chainID] = reference.split(':');
  //   const [erc_namespace, contractAddress] = asset_namespace.split(':');

  //   if (!eip_namespace || eip_namespace.toLowerCase() !== 'eip155')
  //     throw new EnsAvatarInvalidNftUriError({ reason: 'Only EIP-155 supported' });
  //   if (!chainID) throw new EnsAvatarInvalidNftUriError({ reason: 'Chain ID not found' });
  //   if (!contractAddress)
  //     throw new EnsAvatarInvalidNftUriError({
  //       reason: 'Contract address not found',
  //     });
  //   if (!tokenID) throw new EnsAvatarInvalidNftUriError({ reason: 'Token ID not found' });
  //   if (!erc_namespace)
  //     throw new EnsAvatarInvalidNftUriError({ reason: 'ERC namespace not found' });

  //   return {
  //     chainID: Number.parseInt(chainID),
  //     namespace: erc_namespace.toLowerCase(),
  //     contractAddress: contractAddress as Address,
  //     tokenID,
  //   };
  // }

  // async function getNftTokenUri<chain extends Chain | undefined>(
  //   client: Client<Transport, chain>,
  //   { nft }: { nft: ParsedNft }
  // ) {
  //   if (nft.namespace === 'erc721') {
  //     return readContract(client, {
  //       address: nft.contractAddress,
  //       abi: [
  //         {
  //           name: 'tokenURI',
  //           type: 'function',
  //           stateMutability: 'view',
  //           inputs: [{ name: 'tokenId', type: 'uint256' }],
  //           outputs: [{ name: '', type: 'string' }],
  //         },
  //       ],
  //       functionName: 'tokenURI',
  //       args: [BigInt(nft.tokenID)],
  //     });
  //   }
  //   if (nft.namespace === 'erc1155') {
  //     return readContract(client, {
  //       address: nft.contractAddress,
  //       abi: [
  //         {
  //           name: 'uri',
  //           type: 'function',
  //           stateMutability: 'view',
  //           inputs: [{ name: '_id', type: 'uint256' }],
  //           outputs: [{ name: '', type: 'string' }],
  //         },
  //       ],
  //       functionName: 'uri',
  //       args: [BigInt(nft.tokenID)],
  //     });
  //   }
  //   throw new EnsAvatarUnsupportedNamespaceError({ namespace: nft.namespace });
}
