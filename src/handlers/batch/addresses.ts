import { createPublicClient, http } from 'viem';
import { IRequest } from 'itty-router';
import { mainnet } from 'viem/chains';
import zod from 'zod';

import { getNamesFromAddresses } from '../../functions/batch/addresses';

const schema = zod.object({
	addresses: zod.array(zod.string().regex(/^0x[a-fA-F0-9]{40}$/)).max(100),
});

export default async function handler(request: IRequest, env: Env): Promise<Response> {
	const body = await request.json().catch(() => ({}));
	const safeSchema = schema.safeParse(body);

	if (!safeSchema.success) {
		return Response.json(safeSchema.error, { status: 400 });
	}

	const { addresses } = safeSchema.data;

	const client = createPublicClient({
		transport: http(env.ETH_RPC),
		chain: mainnet,
		batch: {
			multicall: true,
		},
	});

	const names = await getNamesFromAddresses(client, addresses);
	return Response.json(names, { status: 200 });
}
