import { Address, PublicClient } from 'viem';
import { normalize } from 'viem/ens';

type Props = {
	client: PublicClient;
	addressOrName: string;
	textKeys: string[] | undefined;
	addressKeys: string[] | number[] | undefined;
};

type TextRecord = { [key: string]: string | null };
type AddressRecord = { [key: string | number]: string | null };

type EnsProfile = {
	name: string | null;
	address: string | null;
	avatar: string | null;
	addresses?: AddressRecord | undefined;
	texts?: TextRecord | undefined;
};

type Response = {
	data: EnsProfile | undefined;
	status: number;
};

export async function getEnsProfile({
	client,
	addressOrName,
	addressKeys,
	textKeys,
}: Props): Promise<Response> {
	// Validate the input
	const inputIsName = addressOrName.includes('.');
	const inputIsAddress = addressOrName.startsWith('0x') && addressOrName.length === 42;
	if (!inputIsName && !inputIsAddress) {
		return { data: undefined, status: 400 };
	}

	// If the input is an address, try to resolve a name
	const name = inputIsAddress
		? await client.getEnsName({ address: addressOrName as Address })
		: normalize(addressOrName);

	// If the input is a name, try to resolve an address
	const address = inputIsName
		? await client.getEnsAddress({ name: normalize(addressOrName) })
		: addressOrName;

	let addresses: EnsProfile['addresses'] = undefined;
	let texts: EnsProfile['texts'] = undefined;
	let avatar: string | null = null;

	if (name) {
		// These will be batched into a single multicall
		const asyncCalls = [client.getEnsAvatar({ name })];

		if (addressKeys) {
			asyncCalls.push(
				...addressKeys.map((key) => {
					return client.getEnsAddress({ name: name, coinType: Number(key) });
				})
			);
		}

		if (textKeys) {
			asyncCalls.push(
				...textKeys.map((key) => {
					return client.getEnsText({ name: name, key });
				})
			);
		}

		const res = await Promise.all(asyncCalls);
		avatar = res.shift() || null;

		if (addressKeys) {
			// Take `addressKeys.length` from the front of the array
			addresses = res
				.splice(0, addressKeys.length)
				.reduce((acc: AddressRecord, curr, index) => {
					const key = addressKeys[index];
					acc[key] = curr;

					return acc;
				}, {});
		}

		if (textKeys) {
			texts = res.reduce((acc: TextRecord, curr, index) => {
				const key = textKeys[index];
				acc[key] = curr;

				return acc;
			}, {});
		}
	}

	return {
		data: {
			name,
			address,
			avatar: avatar,
			addresses: addressKeys ? addresses : undefined,
			texts: textKeys ? texts : undefined,
		},
		status: 200,
	};
}
