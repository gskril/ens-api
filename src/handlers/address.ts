import { Address, createPublicClient, http } from 'viem';
import { IRequest } from 'itty-router';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import zod from 'zod';

const defaultKeys = ['description', 'avatar', 'url', 'com.twitter', 'com.github', 'url'];
const addressSchema = zod.object({ address: zod.string().regex(/^0x[a-fA-F0-9]{40}$/) });
const keySchema = zod.object({ keys: zod.array(zod.string()) });

export default async function handler(request: IRequest, env: Env): Promise<Response> {
	// Check for an address or name
	const safeAddressSchema = addressSchema.safeParse(request.params);
	if (!safeAddressSchema.success) {
		return Response.json(safeAddressSchema.error, { status: 400 });
	}
	const { address } = safeAddressSchema.data;

	// Check for a keys array or use the defaults
	let keys = defaultKeys;
	const body = await request.json().catch(() => ({}));
	const safeKeySchema = keySchema.safeParse(body);
	if (safeKeySchema.success) {
		keys = safeKeySchema.data.keys;
	}

	// Create a client to the Ethereum RPC
	const client = createPublicClient({
		transport: http(env.ETH_RPC),
		chain: mainnet,
		batch: {
			multicall: true,
		},
	});

	const name = await client.getEnsName({ address: address as Address });

	if (!name) {
		return Response.json('Name does not exist', { status: 404 });
	}

	const normalizedName = normalize(name);

	// These will be batched into a single multicall
	const asyncCalls = [
		client.getEnsAvatar({ name: normalizedName }),
		...keys.map((key) => {
			return client.getEnsText({ name: normalizedName, key });
		}),
	];

	const res = await Promise.all(asyncCalls);
	const avatar = res.shift();

	// Format the records in an object
	const records = res.reduce((acc: { [key: string]: string | null }, curr, index) => {
		const key = keys[index];
		acc[key] = curr;

		return acc;
	}, {});

	const nameData = {
		name: normalizedName,
		address,
		avatar,
		records,
	};

	return Response.json(nameData, { status: 200 });
}
