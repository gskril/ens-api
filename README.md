# ENS Records API

⚠️ If you plan to use this in production, please [deploy your own endpoint](#deploy-your-own) (it's free until heavy traffic).

Request `/name.eth` or `/0x...` and the API will return the following ENS records:

- description
- avatar
- url
- telegram
- twitter
- github
- email

It works with ENS names and Ethereum addresses, but is slightly faster with ENS names.

## Deploy your own

All you need is a GitHub account, a Vercel account, and a JSON RPC endpoint from a provider such as [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgskril%2Fens-records-api&env=RPC_URL&project-name=ens-records-api&repo-name=ens-records-api)

Under "Configure Project", add the RPC endpoint.

Once Vercel is done deploying your project, press "Go to Dashboard" then "Visit". That is your deployed API!

## Run locally

You will need [Node.js](https://nodejs.org/en/download/) and npm installed on your machine.

1. Install dependencides with `npm install`
2. Rename `.env.example` to `.env` and add your RPC endpoint
3. Install the [Vercel CLI](https://vercel.com/download)
4. Start the local server with `vercel dev`
