# ENS Records API

The API can be hosted in two ways: [serverless on Vercel](vercel-serverless/README.md) or an [Express.js server](express/README.md).

The Express.js version has more features but is slightly slower. Here's a quick overview of the differences:

Vercel:

- Individually fetches predetermined text records

Express:

- Fetches all text records (makes a call to TheGraph first, which is why it's a bit slower)
  - If you wanted to change this, just set `skipGraph` to `true` [here](https://github.com/gskril/ens-records-api/blob/main/express/src/handlers/ens-profile.ts#L57)
- Adds a `/batch` endpoint to reverse resolve a list of addresses
