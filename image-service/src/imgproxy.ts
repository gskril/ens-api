const IMGPROXY_UNIX_SOCKET = process.env.IMGPROXY_UNIX_SOCKET;
const IMGPROXY_ORIGIN =
  process.env.IMGPROXY_ORIGIN || (IMGPROXY_UNIX_SOCKET ? 'http://imgproxy' : 'http://127.0.0.1:8081');

type ImgproxyFetchInit = RequestInit & {
  unix?: string;
};

export async function transformAvatarImage(sourceUrl: string, width: number, height: number) {
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
