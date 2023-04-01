import 'dotenv/config'
import { ethers } from 'ethers'

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || '')

export default async function handler(req, res) {
  const { input } = req.query
  let name, address

  if (input.length === 42 && input.startsWith('0x')) {
    // If the input is likely to be an ETH address, normalize character cases using getIcapAddress
    try {
      address = ethers.utils.getAddress(ethers.utils.getIcapAddress(input))
      name = await provider.lookupAddress(address) // null if the address doesn't have a primary ENS name
    } catch (err) {
      name = input
      address = null
    }
  } else {
    name = input
    address = null
  }

  if (name === null) {
    if (address) {
      return res
        .status(404)
        .json({ error: 'Primary name not found for this address' })
    }

    return res.status(404).json({ error: 'Address not found' })
  }

  const resolver = await provider.getResolver(name)

  if (resolver === null) {
    return res.status(404).json({ error: 'Address not found' })
  }

  const batch = await Promise.all([
    resolver.getAvatar(),
    resolver.getText('description'),
    resolver.getText('url'),
    resolver.getText('org.telegram'),
    resolver.getText('com.twitter'),
    resolver.getText('com.github'),
    resolver.getText('email'),
  ])

  const records = {
    name: name,
    address: address ? address : await provider.resolveName(name),
    avatar: batch[0]?.url,
    description: batch[1],
    url: batch[2],
    telegram: batch[3],
    twitter: batch[4],
    github: batch[5],
    email: batch[6],
  }

  // Set CORS headers
  res.setHeader('Cache-Control', 's-maxage=60')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  res.status(200).json(records)
}
