# ENS API

Cloudflare Worker that provides a simple API for fetching ENS profiles and avatars. Built with [ENSjs](https://www.npmjs.com/package/@ensdomains/ensjs), heavily inspired by [v3xlabs/enstate](https://github.com/v3xlabs/enstate).

By default, all endpoints are cached for 10 minutes, then serve a stale response within the following 50 minutes while refreshing the cache in the background. Adjust these settings [here](src/lib/utils.ts#L65-L82). Avatars are cached for longer in most cases.

## Endpoints:

- GET `/n/:name` - Fetch a profile for an ENS name
  - Params (all optional):
    - `texts` - keys of text records to fetch (comma-separated)
    - `coins` - coin types to fetch (comma-separated)
- GET `/a/:address` - Fetch a profile for an Ethereum address, if it has a primary ENS name
  - Params (all optional):
    - `texts` - keys of text records to fetch (comma-separated)
    - `coins` - coin types to fetch (comma-separated)
- GET `/avatar/:name` - Fetch an avatar for an ENS name
  - Params (all optional):
    - `width` - width of the avatar (default: 256)
    - `height` - height of the avatar (default: 256)
- POST `/batch/names` - Resolve a list of addresses from ENS names
  - Body:
    - `names` - array of ENS names
    - `coinType` (optional) - coin type to resolve (default: 60)
- POST `/batch/addresses` - Resolve a list of ENS names from ETH addresses
  - Body:
    - `addresses` - array of ETH addresses

## How to run locally:

Clone this repo

```bash
git clone https://github.com/gskril/ens-api.git
```

Install dependencies

```bash
yarn install
```

Set your environment variables (ETH RPC URL)

```bash
cp .dev.vars.example .dev.vars
```

Run the development server

```bash
yarn run dev
```

## Deploy to Cloudflare

Sign into the Cloudflare CLI

```bash
npx wrangler login
```

Deploy the Worker

```bash
yarn run deploy
```

Set your ETH RPC environment variable

```bash
echo <VALUE> | npx wrangler secret put ETH_RPC
```

In order to enable avatar transformations, you will need to configure Cloudflare in a few ways:

- Under "Images" > "Transformations", navigate to the zone you want to use and enable transformations.
- Deploy this Worker to your Cloudflare account by following the instructions above.
- Make your Worker accessible from the zone (domain) you enabled in step 1.
  - In the domain's DNS page, create an `A` record that points to `192.0.2.0` with any name you want as a subdomain.
  - Under "Worker Routes", add a route that matches the subdomain you created and points to the Worker you deployed.
