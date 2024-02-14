import { createCors, error, Router } from 'itty-router';

import handleProfile from './handlers/profile';
import handleBatchAddresses from './handlers/batch/addresses';
import handleBatchNames from './handlers/batch/names';

const router = Router();
const { preflight, corsify } = createCors();

router
  .all('*', preflight)
  .get('/', () => Response.json(indexJson))
  .get('/profile/:addressOrName', (request, env) => handleProfile(request, env))
  .post('/batch/addresses', (request, env) => handleBatchAddresses(request, env))
  .post('/batch/names', (request, env) => handleBatchNames(request, env))
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
      endpoint: '/profile/:addressOrName',
      description: 'Returns ENS profile for a name or ETH address',
      params: ['texts', 'addresses'],
    },
    {
      method: 'POST',
      endpoint: '/batch/addresses',
      description: 'Returns ENS names for a list of ETH addresses',
      body: ['addresses'],
    },
    {
      method: 'POST',
      endpoint: '/batch/names',
      description: 'Returns ETH addresses for a list of ENS names',
      body: ['names'],
    },
  ],
};
