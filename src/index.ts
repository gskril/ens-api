import { AutoRouter, cors, error } from 'itty-router';

import { handleAddress } from './handlers/address';
import { handleAddresses } from './handlers/batch/addresses';
import { handleAvatar } from './handlers/avatar';
import { handleName } from './handlers/name';
import { handleNames } from './handlers/batch/names';

const { preflight, corsify } = cors();

const router = AutoRouter({
  before: [preflight],
  finally: [corsify],
});

router
  .get('/', () => Response.json(indexJson))
  .get('/name/:name', handleName)
  .get('/address/:address', handleAddress)
  .get('/avatar/:name', handleAvatar)
  .post('/batch/addresses', handleAddresses)
  .post('/batch/names', handleNames)
  .all('*', () => error(404));

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

export default router;
