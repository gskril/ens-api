import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const IMGPROXY_UNIX_SOCKET = process.env.IMGPROXY_UNIX_SOCKET;
const IMGPROXY_ORIGIN =
  process.env.IMGPROXY_ORIGIN || (IMGPROXY_UNIX_SOCKET ? 'http://imgproxy' : 'http://127.0.0.1:8081');
const IMGPROXY_LOCAL_ROOT = process.env.IMGPROXY_LOCAL_FILESYSTEM_ROOT || '/tmp/imgproxy';

type ImgproxyFetchInit = RequestInit & {
  unix?: string;
};

export async function transformAvatarImage(sourceUrl: string, width: number, height: number) {
  if (sourceUrl.startsWith('data:')) {
    return transformDataUriThroughImgproxy(sourceUrl, width, height);
  }

  return fetchFromImgproxy(sourceUrl, width, height);
}

async function transformDataUriThroughImgproxy(dataUri: string, width: number, height: number) {
  const bytes = decodeDataUriBytes(dataUri);
  if (!bytes) {
    return null;
  }

  const filename = randomUUID();
  const filepath = join(IMGPROXY_LOCAL_ROOT, filename);

  try {
    await writeFile(filepath, bytes);
    const response = await fetchFromImgproxy(`local:///${filename}`, width, height);

    if (!response) {
      return null;
    }

    // Buffer the body so imgproxy is fully done reading the source before we unlink it
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      headers: response.headers,
    });
  } finally {
    await unlink(filepath).catch(() => {});
  }
}

function decodeDataUriBytes(dataUri: string): Uint8Array | null {
  const commaIndex = dataUri.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }

  const meta = dataUri.slice('data:'.length, commaIndex);
  const payload = dataUri.slice(commaIndex + 1);
  const isBase64 = meta.endsWith(';base64');
  const mediaType = (isBase64 ? meta.slice(0, -';base64'.length) : meta) || 'application/octet-stream';

  if (!mediaType.startsWith('image/')) {
    return null;
  }

  try {
    if (isBase64) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(payload));
  } catch {
    return null;
  }
}

async function fetchFromImgproxy(sourceUrl: string, width: number, height: number) {
  const init: ImgproxyFetchInit = {
    headers: {
      Accept: 'image/webp',
    },
  };

  if (IMGPROXY_UNIX_SOCKET) {
    init.unix = IMGPROXY_UNIX_SOCKET;
  }

  const response = await fetch(createImgproxyUrl(sourceUrl, width, height), init);

  if (!isUsableImageResponse(response)) {
    return null;
  }

  return response;
}

function createImgproxyUrl(sourceUrl: string, width: number, height: number) {
  const encodedSource = encodeURIComponent(sourceUrl);
  return `${IMGPROXY_ORIGIN}/insecure/resize:fill:${width}:${height}:1/plain/${encodedSource}@webp`;
}

function isUsableImageResponse(response: Response) {
  if (response.status < 200 || response.status >= 400) {
    return false;
  }

  const contentType = response.headers.get('Content-Type');
  return !contentType || contentType.startsWith('image/');
}
