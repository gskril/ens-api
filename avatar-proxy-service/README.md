# ENS Avatar + imgproxy service plan

This folder is a **new add-on service** (no existing app code removed) that combines:

1. ENS avatar lookup over Ethereum RPC via `viem` (`getEnsAvatar`).
2. Local image optimization via `imgproxy` in the same container.

## Request flow

1. `GET /avatar/:name?width=256&height=256`
2. API checks cache for ENS avatar URL (not transformed image bytes).
3. On cache miss, API calls `client.getEnsAvatar({ name })` using `ETH_RPC`.
4. API builds an imgproxy URL and fetches optimized output from local `imgproxy`.
5. API returns optimized bytes + cache headers.

## Caching strategy

Use **two cache layers** with clear responsibilities:

### Layer 1: ENS avatar URL cache (entrypoint cache, before imgproxy)

Purpose: avoid unnecessary Ethereum RPC reads.

- Key: `ens:avatar:url:{name}`
- Value: source avatar URL returned from ENS text records / NFT metadata resolution.
- TTL suggestion: 1 hour default (`AVATAR_URL_CACHE_TTL_SECONDS=3600`), tune to 5-30 min if you need faster refresh.
- Store:
  - Local LRU in-process cache (fast, cheap).
  - Optional Redis shared cache (`REDIS_URL`) so multiple replicas avoid duplicate RPC calls.

Why this layer matters:

- imgproxy caches transformed bytes by source URL + transform options, but **it does not know ENS names**.
- Without this layer, every cold request still needs an RPC lookup even if transforms are cached.

### Layer 2: imgproxy image cache

Purpose: avoid repeated image resize/encode and repeated upstream source downloads.

- imgproxy handles transformed image caching and revalidation.
- Set `IMGPROXY_TTL` high (for example 1 year) and rely on source URL changes when users update avatars.
- You can add a CDN in front (Railway edge/proxy/CDN) for global caching of final bytes.

## Why not only imgproxy cache?

If you only cache at imgproxy:

- You still pay RPC latency/cost for name->avatar resolution on misses at your API entrypoint.
- Burst traffic for the same ENS name across replicas can trigger duplicate `getEnsAvatar` calls.

Recommendation: keep both layers. This gives the best cost profile.

## Railway deployment notes

- Deploy `avatar-proxy-service/Dockerfile` as a dedicated service.
- Required env vars:
  - `ETH_RPC` (required)
  - `REDIS_URL` (optional but recommended for replicas)
  - `IMGPROXY_KEY`, `IMGPROXY_SALT` (recommended for signed URLs later)
  - `PORT` (Railway injects this)
- Scale via replicas by region; Redis should be shared (or region-local) to preserve entrypoint cache benefit.

## Suggested roadmap

1. **MVP** (this scaffold): endpoint + local LRU + local imgproxy process.
2. **Production hardening**:
   - Add request signing for imgproxy paths (remove `/insecure`).
   - Add allowlist / SSRF protections for source hosts.
   - Add metrics: RPC hit/miss, cache hit ratio, imgproxy status codes.
3. **Performance**:
   - Enable Redis for cross-replica cache sharing.
   - Put a CDN in front of `/avatar/:name` for byte-level caching near users.
4. **Monorepo migration later**:
   - Move this folder into `apps/avatar-proxy` when you reorganize.

