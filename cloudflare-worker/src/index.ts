import { createCors, error, Router } from 'itty-router';

import { handleAddress } from './handlers/address';
import { handleAddresses } from './handlers/batch/addresses';
import { handleAvatar } from './handlers/avatar';
import { handleName } from './handlers/name';
import { handleNames } from './handlers/batch/names';

const router = Router();
const { preflight, corsify } = createCors();

router
  .all('*', preflight)
  .get('/', () => Response.json(indexJson))
  .get('/n/:name', (request, env, ctx) => handleName(request, env, ctx))
  .get('/a/:address', (request, env, ctx) => handleAddress(request, env, ctx))
  .get('/avatar/:name', (request, env) => handleAvatar(request, env))
  .post('/batch/addresses', (request, env, ctx) => handleAddresses(request, env, ctx))
  .post('/batch/names', (request, env, ctx) => handleNames(request, env, ctx))
  .all('*', () => error(404));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx).then(corsify).catch(error);
  },
};

const indexJson = {
  endpoints: [
    {
      method: 'GET',
      endpoint: '/n/:name',
      params: ['texts', 'coins'],
    },
    {
      method: 'GET',
      endpoint: '/a/:address',
      params: ['texts', 'coins'],
    },
    {
      method: 'GET',
      endpoint: '/avatar/:name',
      params: ['width', 'height'],
    },
    {
      method: 'POST',
      endpoint: '/batch/addresses',
      body: ['addresses'],
    },
    {
      method: 'POST',
      endpoint: '/batch/names',
      body: ['names', 'coinType'],
    },
  ],
};
