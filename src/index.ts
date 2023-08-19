import { createCors, error, Router } from 'itty-router';
import handleName from './handlers/name';
import handleAddress from './handlers/address';

const router = Router();
const { preflight, corsify } = createCors();

router
	.all('*', preflight)
	.get('/a/:address', (request, env) => handleAddress(request, env))
	.get('/n/:name', (request, env) => handleName(request, env))
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
