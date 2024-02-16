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
  .get('/n/:name', (request, env) => handleName(request, env))
  .get('/a/:address', (request, env) => handleAddress(request, env))
  .get('/avatar/:name', (request, env) => handleAvatar(request, env))
  .post('/batch/addresses', (request, env) => handleAddresses(request, env))
  .post('/batch/names', (request, env) => handleNames(request, env))
  .all('*', () => error(404));

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router.handle(request, env).then(corsify).catch(error);
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
      body: ['names'],
    },
  ],
};
