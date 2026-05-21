const IMGPROXY_UNIX_SOCKET = process.env.IMGPROXY_UNIX_SOCKET;
const IMGPROXY_ORIGIN =
  process.env.IMGPROXY_ORIGIN || (IMGPROXY_UNIX_SOCKET ? 'http://imgproxy' : 'http://127.0.0.1:8081');

type ImgproxyFetchInit = RequestInit & {
  unix?: string;
};

export async function transformAvatarImage(sourceUrl: string, width: number, height: number) {
  if (sourceUrl.startsWith('data:')) {
    return decodeDataUriResponse(sourceUrl);
  }

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

function decodeDataUriResponse(dataUri: string) {
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

  let bytes: Uint8Array<ArrayBuffer>;
  try {
    if (isBase64) {
      const binary = atob(payload);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
    } else {
      const encoded = new TextEncoder().encode(decodeURIComponent(payload));
      bytes = new Uint8Array(encoded.byteLength);
      bytes.set(encoded);
    }
  } catch {
    return null;
  }

  return new Response(new Blob([bytes], { type: mediaType }), {
    status: 200,
    headers: {
      'Content-Type': mediaType,
      'Content-Length': String(bytes.byteLength),
    },
  });
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
