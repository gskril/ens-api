import { IRequest } from 'itty-router';
import { z } from 'zod';

import { fallbackResponse } from '../avt-fallback';
import { getPublicClient } from '../utils';

const schema = z.object({
	name: z.string(),
	width: z.coerce.number().default(256).optional(),
	height: z.coerce.number().default(256).optional(),
});

export async function handleTransform(request: IRequest, env: Env) {
	const params = { ...request.params, ...request.query };
	const safeParse = schema.safeParse(params);

	if (!safeParse.success) {
		return new Response('Invalid request', { status: 400 });
	}

	const { name, width, height } = safeParse.data;

	const client = getPublicClient(env);
	const ensAvatar = await client.getEnsAvatar({ name });

	if (!ensAvatar) {
		return fallbackResponse();
	}

	const res = await fetch(ensAvatar, {
		headers: request.headers,
		cf: {
			cacheTtl: 3600,
			image: {
				width,
				height,
				fit: 'cover',
			},
		},
	});

	if (res.ok || res.redirected) {
		return res;
	} else {
		return fallbackResponse();
	}
}
