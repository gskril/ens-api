import { PublicClient } from 'viem';
import { normalize } from 'viem/ens';

export async function getAddressesFromNames(client: PublicClient, names: string[]) {
	const normalizedNames = names.map((name) => {
		try {
			return normalize(name);
		} catch (error) {
			return null;
		}
	});

	// These will be batched into a single multicall
	const asyncCalls = normalizedNames.map((name) => {
		if (!name) {
			return null;
		}

		return client.getEnsAddress({ name });
	});

	const addresses = await Promise.all(asyncCalls);
	return addresses;
}
