import { ENS } from '@ensdomains/ensjs'
import { ethers } from 'ethers'

const RPC_URL = process.env.RPC_URL

if (!RPC_URL) {
  throw new Error('No RPC_URL provided')
}

export const provider = new ethers.providers.JsonRpcProvider(RPC_URL)

export const ENSInstance = new ENS()
await ENSInstance.setProvider(provider)
