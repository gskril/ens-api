# ENS API

The API can be hosted in three ways:

- [Cloudflare Worker](cloudflare-worker/README.md) (recommended)
- [Serverless on Vercel](vercel-serverless/README.md)
- [Express.js server](express/README.md)

Cloudflare:

- Avatar transformer
- Fetch any text or coin records for a given name or address
- Batch name and address resolution

Vercel:

- Individually fetches predetermined text records

Express:

- Fetches all text records (makes a call to TheGraph first, which is why it's a bit slower)
  - If you wanted to change this, just set `skipGraph` to `true` [here](express/src/handlers/ens-profile.ts#L57)
- Adds a `/batch` endpoint to reverse resolve a list of addresses
