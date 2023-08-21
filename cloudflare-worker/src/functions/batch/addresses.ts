import { Address, PublicClient } from 'viem';
import { normalize } from 'viem/ens';

export async function getNamesFromAddresses(client: PublicClient, addresses: string[]) {
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
