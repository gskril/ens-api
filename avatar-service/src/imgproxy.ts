const IMGPROXY_ORIGIN = 'http://127.0.0.1:8081';

export async function transformAvatarImage(sourceUrl: string, width: number, height: number) {
  const response = await fetch(createImgproxyUrl(sourceUrl, width, height), {
    headers: {
      Accept: 'image/webp',
    },
  });

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
