# ENS API

> [!NOTE]  
> This is meant to be self-hosted. Follow the instructions below to deploy it to your own Cloudflare account.

Cloudflare Worker that provides a simple API for fetching ENS profiles and avatars. Built with [ENSjs](https://www.npmjs.com/package/@ensdomains/ensjs), inspired by [v3xlabs/enstate](https://github.com/v3xlabs/enstate).

By default, profile and batch endpoints are cached for 10 minutes, then serve a stale response within the following 50 minutes while refreshing the cache in the background. Adjust these settings [here](src/lib/utils.ts#L79-L96).

Avatar endpoints use a separate cache policy:

- Live ENS avatars are cached for 24 hours, then serve stale responses for up to 1 week while refreshing in the background.
- Default and custom fallback avatars are cached for 1 hour, then serve stale responses for up to 24 hours while refreshing in the background.
- `fallback=none` returns an uncached 404 when no avatar is found.
- Avatar cache entries vary by the full request URL, so distinct `width`, `height`, and `fallback` params are cached independently.

## Endpoints:

- GET `/name/:name` - Fetch a profile for an ENS name
  - Params (all optional):
    - `texts` - keys of text records to fetch (comma-separated)
    - `coins` - coin types to fetch (comma-separated)
- GET `/address/:address` - Fetch a profile for an Ethereum address, if it has a primary ENS name
  - Params (all optional):
    - `texts` - keys of text records to fetch (comma-separated)
    - `coins` - coin types to fetch (comma-separated)
    - `chain` - chain id or coin type to fetch the reverse record for (default: 1)
- GET/HEAD `/avatar/:name` - Fetch an avatar for an ENS name
  - Params (all optional):
    - `width` - width of the avatar (default: 256)
    - `height` - height of the avatar (default: 256)
    - `fallback` - image URL to use if the ENS name has no avatar. Set to `none` to return a 404 instead of a fallback image.
- POST `/batch/names` - Resolve a list of addresses from ENS names
  - Body:
    - `names` - array of ENS names
    - `coinType` (optional) - coin type to resolve (default: 60)
- POST `/batch/addresses` - Resolve a list of primary ENS names from ETH addresses
  - Body:
    - `addresses` - array of ETH addresses

## Deploy to Cloudflare

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/gskril/ens-api)

Follow the instructions to set the `ETH_RPC` environment variable.

In order to enable avatar transformations, you will need to configure Cloudflare in a few ways:

- Add a custom domain for this Worker.
- Under "Images" > "Transformations", navigate to the zone (domain) you configured and enable transformations.

## How to run locally:

Clone this repo

```bash
git clone https://github.com/gskril/ens-api.git
```

Install dependencies

```bash
bun install
```

Set your environment variables (`ETH_RPC`)

```bash
cp .dev.vars.example .dev.vars
```

Run the development server

```bash
bun run dev
```
