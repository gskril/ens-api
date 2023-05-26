# ENS Records API

This server has two endpoints:

- `/:nameOrAddress` - GET - returns an ENS profile for a name or address
- `/batch` - POST - returns an array of primary ENS names for a list of addresses

## Deploy your own

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/ffg_BC?referralCode=ONtqGs)

Follow the prompts to enter your RPC endpoint and deploy

## Run locally

1. Install dependencides: `yarn install`
2. Set your environment variables (RPC endpoint): `cp .env.example .env`
3. Start the local server: `yarn dev`
