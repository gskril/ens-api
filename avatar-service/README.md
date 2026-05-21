# ENS Avatar Service

Self-contained Railway service for resolving ENS avatars with Viem and transforming them through a private local imgproxy process.

The existing Cloudflare Worker remains unchanged. Deploy this directory as a separate Railway service.

## Endpoints

- `GET /:network/avatar/:name`
- `HEAD /:network/avatar/:name`

`network` must be `mainnet` or `sepolia`.

`/:network/avatar/:name` accepts:

- `width` - output width in pixels. Defaults to `256`.
- `height` - output height in pixels. Defaults to `width`, or `256` when neither is provided.
- `fallback` - image URL to return when the ENS name has no avatar. Use `fallback=none` for an uncached `404`.

Live ENS avatars are returned as WebP images to keep Railway CDN cache keys deterministic.

## Caching

The service intentionally does not use an in-memory cache and does not enable imgproxy internal cache. It relies on Railway CDN and HTTP cache headers:

- Live avatars: `public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800`
- Fallback avatars: `public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`
- Validation errors, lookup failures, transform failures, and `fallback=none`: `no-store`

Railway CDN should cache by the full request URL, including query params.

When this service is fronted by Cloudflare, add a Cache Rule for the service
hostname. Cloudflare's default cache eligibility is based on URL file
extensions, not the `Content-Type` header, so extensionless avatar URLs such as
`/mainnet/avatar/gregskril.eth?width=64` can return `Cf-Cache-Status: DYNAMIC`
even with the cache headers above.

Recommended Cloudflare Cache Rule:

```text
http.host eq "<your-domain>"
```

Use these Cloudflare rule settings:

- Cache eligibility: `Eligible for cache`
- Browser TTL: `Respect origin TTL`

Leave the other optional cache rule settings unset. This lets Cloudflare use the
service's `Cache-Control` headers for edge TTLs, browser TTLs, stale revalidation,
and `no-store` responses. The default cache key includes the query string, which
is required because `width`, `height`, and `fallback` can change the image
response.

## Environment

Required:

- `MAINNET_RPC` - Ethereum mainnet RPC URL.

Optional:

- `SEPOLIA_RPC` - Sepolia RPC URL. Required only for `/sepolia/avatar/:name`.
- `IPFS_GATEWAY` - defaults to `https://ipfs.io`.
- `MAX_AVATAR_DIMENSION` - defaults to `1024`.
- `IMGPROXY_BIND` - defaults to `127.0.0.1:8081`.
- `IMGPROXY_MAX_SRC_FILE_SIZE` - defaults to `10485760`.
- `IMGPROXY_MAX_SRC_RESOLUTION` - defaults to `25`.
- `IMGPROXY_MAX_RESULT_DIMENSION` - defaults to `1024`.
- `IMGPROXY_MAX_ANIMATION_FRAMES` - defaults to `1`.
- `IMGPROXY_SANITIZE_SVG` - defaults to `true`.
- `IMGPROXY_ALLOW_PRIVATE_SOURCE_ADDRESSES` - defaults to `false`.
- `IMGPROXY_ALLOW_LOOPBACK_SOURCE_ADDRESSES` - defaults to `false`.
- `IMGPROXY_ALLOW_LINK_LOCAL_SOURCE_ADDRESSES` - defaults to `false`.

The Bun server uses imgproxy's `/insecure/` path because imgproxy only listens on loopback inside the container and is not exposed publicly.

## Railway Deploy

Use this directory as the service root, or set the Railway service variable:

```text
RAILWAY_DOCKERFILE_PATH=avatar-service/Dockerfile
```

If the service root is `avatar-service/`, Railway can use `Dockerfile` directly.

Set `MAINNET_RPC`, enable Railway CDN for the public domain, and expose the service over HTTP. Railway provides `PORT`; the container defaults to `3000` for local runs.

## Local Docker Smoke Test

```bash
docker build -f avatar-service/Dockerfile avatar-service -t ens-avatar-service
docker run --rm -p 3000:3000 -e MAINNET_RPC="$MAINNET_RPC" ens-avatar-service
```

Then check:

```bash
curl -I 'http://localhost:3000/mainnet/avatar/vitalik.eth?width=128'
curl -i 'http://localhost:3000/mainnet/avatar/does-not-exist-123456789.eth?fallback=none'
```
