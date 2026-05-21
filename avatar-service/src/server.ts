import { z } from 'zod';

import { networkSchema, normalizeEnsName, resolveEnsAvatar } from './ens';
import { parseEnvInt } from './env';
import { fallbackResponse } from './fallback';
import { transformAvatarImage } from './imgproxy';
import {
  jsonResponse,
  LIVE_AVATAR_CACHE_CONTROL,
  methodNotAllowed,
  NO_STORE,
  withCacheControl,
  withoutHeadBody,
} from './http';

const DEFAULT_SIZE = 256;
const MAX_AVATAR_DIMENSION = parseEnvInt('MAX_AVATAR_DIMENSION', 1024);

const pathSchema = z.object({
  network: networkSchema,
  name: z.string().min(1),
});

const optionalDimensionSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().positive().max(MAX_AVATAR_DIMENSION).optional(),
);

const fallbackSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.union([z.literal('none'), z.string().url()]).optional(),
);

const querySchema = z.object({
  width: optionalDimensionSchema,
  height: optionalDimensionSchema,
  fallback: fallbackSchema,
});

Bun.serve({
  hostname: '0.0.0.0',
  port: Number(process.env.PORT || '3000'),
  routes: {
    '/': new Response('ENS avatar transformer', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': NO_STORE,
      },
    }),
    '/:network/avatar/:name': {
      GET: (request) => handleAvatarRoute(request),
      HEAD: async (request) => withoutHeadBody(request, await handleAvatarRoute(request)),
    },
  },
  fetch() {
    return jsonResponse({ error: 'Not found' }, 404, NO_STORE);
  },
  error(error) {
    console.error(error);
    return jsonResponse({ error: 'Internal server error' }, 500, NO_STORE);
  },
});

console.log(`ENS avatar service listening on ${process.env.PORT || '3000'}`);

async function handleAvatarRoute(request: Request & { params: Record<string, string> }) {
  const parsed = parseAvatarRequest(request.params, new URL(request.url).searchParams);

  if (!parsed.success) {
    return jsonResponse({ error: z.treeifyError(parsed.error) }, 400, NO_STORE);
  }

  const { fallback, height, name, network, width } = parsed.data;
  let ensAvatar: string | null;

  try {
    ensAvatar = await resolveEnsAvatar(network, name);
  } catch (error) {
    console.error('ENS avatar lookup failed', {
      network,
      name,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'ENS avatar lookup failed' }, 502, NO_STORE);
  }

  if (!ensAvatar) {
    return fallbackResponse(fallback);
  }

  let transformed: Response;

  try {
    const response = await transformAvatarImage(ensAvatar, width, height);

    if (!response) {
      console.error('imgproxy returned unusable response', {
        network,
        name,
      });
      return fallbackResponse(fallback);
    }

    transformed = response;
  } catch (error) {
    console.error('imgproxy request failed', {
      network,
      name,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackResponse(fallback);
  }

  return withCacheControl(transformed, LIVE_AVATAR_CACHE_CONTROL);
}

function parseAvatarRequest(
  params: Record<string, string>,
  searchParams: URLSearchParams,
) {
  return pathSchema
    .extend({
      name: z
        .string()
        .min(1)
        .transform((name, ctx) => {
          try {
            return normalizeEnsName(name);
          } catch {
            ctx.addIssue({
              code: 'custom',
              message: 'Invalid ENS name',
            });
            return z.NEVER;
          }
        }),
    })
    .and(querySchema)
    .transform(({ width, height, ...data }) => ({
      ...data,
      width: width ?? height ?? DEFAULT_SIZE,
      height: height ?? width ?? DEFAULT_SIZE,
    }))
    .safeParse({
      ...params,
      width: searchParams.get('width'),
      height: searchParams.get('height'),
      fallback: searchParams.get('fallback'),
    });
}
