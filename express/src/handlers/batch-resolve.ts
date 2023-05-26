import { Request, Response } from 'express'
import { ens_normalize as normalize } from '@adraffy/ens-normalize'

import { ENSInstance } from '../provider.js'
import { TTL, cache } from '../cache.js'

export default async function handler(req: Request, res: Response) {
  const addresses = req.body.addresses as string[] | undefined

  if (!addresses || !Array.isArray(addresses)) {
    return res.status(400).json({ error: 'Missing addresses' })
  }

  // check if the request is cached
  const cachedResponse = cache.get(buildCacheKey(addresses))
  if (cachedResponse) {
    return res.status(200).json(cachedResponse)
  }

  const resolvedAddresses = await resolveENS(addresses)

  // cache the response
  cache.set(buildCacheKey(addresses), resolvedAddresses, TTL)
  return res.status(200).json(resolvedAddresses)
}

async function resolveENS(addresses: string[]) {
  const batched = await ENSInstance.batch(
    ...addresses.map((address) => ENSInstance.getName.batch(address))
  )

  if (!batched) {
    return []
  }

  const names = batched.map((name, i) => {
    if (!name) {
      return {
        name: shortenAddress(addresses[i]) as string,
        address: addresses[i],
      }
    }

    let normalizedName = shortenAddress(addresses[i])

    try {
      normalizedName = normalize(name.name)
    } catch (error) {}

    return {
      name: normalizedName,
      address: addresses[i],
    }
  })

  return names
}

const shortenAddress = (address: string) => {
  if (address.length < 10) {
    return address
  }

  return `${address.slice(0, 5)}...${address.slice(-5)}`
}

function buildCacheKey(addresses: string[]) {
  const shortenedAddresses = addresses.map(shortenAddress).join(',')
  return `ens-resolve-${shortenedAddresses}`
}
