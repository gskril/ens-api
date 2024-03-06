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
  .get('/name/:name', handleName)
  .get('/address/:address', handleAddress)
  .get('/avatar/:name', handleAvatar)
  .post('/batch/addresses', handleAddresses)
  .post('/batch/names', handleNames)
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
      endpoint: '/name/:name',
      params: ['texts', 'coins'],
    },
    {
      method: 'GET',
      endpoint: '/address/:address',
      params: ['texts', 'coins'],
    },
    {
      method: 'GET',
      endpoint: '/avatar/:name',
      params: ['width', 'height', 'fallback'],
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
