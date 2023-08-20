import { createCors, error, Router } from 'itty-router';

import handleProfile from './handlers/profile';
import handleBatchAddresses from './handlers/batch/addresses';
import handleBatchNames from './handlers/batch/names';

const router = Router();
const { preflight, corsify } = createCors();

router
	.all('*', preflight)
	.get('/profile/:addressOrName', (request, env) => handleProfile(request, env))
	.post('/batch/addresses', (request, env) => handleBatchAddresses(request, env))
	.post('/batch/names', (request, env) => handleBatchNames(request, env))
	.all('*', () => error(404));

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		return router
			.handle(request, env)
			.then(corsify)
			.catch((err) => {
				return new Response(err, { status: 500 });
			});
	},
};
