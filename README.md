# ENS Records API

⚠️ If you plan to use this in production, please [deploy your own endpoint](#deploy-your-own) (it's free until heavy traffic).

Request `/name.eth` or `/0x...` and the API will return the following ENS records:
- description
- avatar (append `?avatar` query to URL)
- url
- telegram
- twitter
- github
- email

It works with ENS names and Ethereum addresses, but is slightly faster with ENS names.

This is probably not the fastest way to fetch the records of an ENS name, but certainly the easiest that I've come across.

## Deploy your own

You don't need any coding experience to deploy your own API endpoint, but you will need a few accounts:

- [GitHub](https://github.com/signup)
- [Vercel](https://vercel.com/signup) for hosting
- [Infura](https://infura.io/register) for connecting to the blockchain

Once you've created those accounts, Deploy to Vercel via the button below and follow the deployment flow.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgskril%2Fens-records-api&env=INFURA_PROJECT_ID,INFURA_PROJECT_SECRET&project-name=ens-records-api&repo-name=ens-records-api)

Under "Configure Project", add the Project ID and Project Secret from Infura.

Once Vercel is done deploying your project, press "Go to Dashboard" then "Visit". That is your API endpoint!

## Run locally

You will need [Node.js](https://nodejs.org/en/download/) and npm installed on your machine.

1. Install dependencides with `npm install`
2. Rename `.env.example` to `.env` and add your Infura project credentials
3. Start the local server with `npm start`
