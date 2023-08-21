import { createPublicClient, http } from 'viem';
import { IRequest } from 'itty-router';
import { mainnet } from 'viem/chains';
import zod from 'zod';

import { getAddressesFromNames } from '../../functions/batch/names';

const schema = zod.object({
	names: zod
		.array(
			zod.string().refine((name) => name.includes('.'), {
				message: 'Name must include a "."',
			})
		)
		.max(100),
});

export default async function handler(request: IRequest, env: Env): Promise<Response> {
	const body = await request.json().catch(() => ({}));
	const safeSchema = schema.safeParse(body);

	if (!safeSchema.success) {
		return Response.json(safeSchema.error, { status: 400 });
	}

	const { names } = safeSchema.data;

	const client = createPublicClient({
		transport: http(env.ETH_RPC),
		chain: mainnet,
		batch: {
			multicall: {
				batchSize: 10_240,
			},
		},
	});

	const addresses = await getAddressesFromNames(client, names);
	return Response.json(addresses, { status: 200 });
}
