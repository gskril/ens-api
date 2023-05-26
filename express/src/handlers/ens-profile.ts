import { Request, Response } from 'express'
import { ENSInstance, provider } from '../provider.js'
import { DecodedContentHash } from '@ensdomains/ensjs/utils/contentHash'
import { AvatarResolver } from '@ensdomains/ens-avatar'
import { JSDOM } from 'jsdom'

import { cache, TTL } from '../cache.js'

const window = new JSDOM().window
const avt = new AvatarResolver(provider)
const fallbackRecords = [
  'avatar',
  'com.github',
  'com.twitter',
  'description',
  'url',
]

export async function getEnsProfile(req: Request, res: Response) {
  const { addressOrName } = req.params

  // check if the profile is cached
  const cachedProfile = cache.get(buildCacheKey(addressOrName))
  if (cachedProfile) {
    return res.status(200).json(cachedProfile)
  }

  try {
    // timeout after 3 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout'))
      }, 3 * 1000)
    })

    const profile = (await Promise.race([
      ENSInstance.getProfile(addressOrName, {
        fallback: {
          texts: fallbackRecords,
        },
      }),
      timeoutPromise,
    ])) as EnsjsProfile

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
      })
    }

    const formattedProfile = await formatProfile(profile, addressOrName)

    // cache the profile
    cache.set(buildCacheKey(addressOrName), formattedProfile, TTL)
    return res.status(200).json(formattedProfile)
  } catch (err: any) {
    // ensjs has a fallabck that returns data even in some errors
    if (err.data) {
      // cache the profile
      const formattedProfile = await formatProfile(err.data, addressOrName)
      cache.set(buildCacheKey(addressOrName), formattedProfile, TTL)
      return res.status(200).json(err.data)
    }

    // if The Graph times out, run the query again with fallback records
    if (err.message === 'Timeout') {
      try {
        const profile = await ENSInstance.getProfile(addressOrName, {
          fallback: {
            texts: fallbackRecords,
          },
          skipGraph: true,
        })

        if (!profile) {
          return res.status(404).json({
            error: 'Profile not found',
          })
        }

        const formattedProfile = await formatProfile(profile, addressOrName)

        // cache the profile
        cache.set(buildCacheKey(addressOrName), formattedProfile, TTL)
        return res.status(200).json(formattedProfile)
      } catch (err) {
        return res.status(500).json(err)
      }
    }

    return res.status(500).json(err)
  }
}

function buildCacheKey(addressOrName: string) {
  return `ens-profile-${addressOrName}`
}

async function formatProfile(
  profile: EnsjsProfile,
  addressOrName: string
): Promise<FormattedProfile> {
  if (!profile.name) profile.name = addressOrName
  if (!profile.address) profile.address = addressOrName

  const avatarRecord = profile.records?.texts?.find(
    (record) => record.key === 'avatar'
  )?.value

  return {
    name: profile.name!,
    address: profile.address!,
    avatar: await encodeAvatar(profile.name!, avatarRecord),
    records:
      profile.records?.texts?.reduce((acc, record) => {
        acc[record.key] = record.value
        return acc
      }, {} as FormattedProfile['records']) || {},
  }
}

type EnsjsProfile = {
  isMigrated: boolean | null
  createdAt: string | null
  address?: string | undefined
  name?: string | null | undefined
  decryptedName?: string | null | undefined
  match?: boolean | undefined
  message?: string | undefined
  records?:
    | {
        contentHash?: string | DecodedContentHash | null | undefined
        texts?:
          | {
              key: string | number
              type: 'text' | 'addr' | 'contentHash'
              coin?: string | undefined
              value: string
            }[]
          | undefined
        coinTypes?:
          | {
              key: string | number
              type: 'text' | 'addr' | 'contentHash'
              coin?: string | undefined
              value: string
            }[]
          | undefined
      }
    | undefined
  resolverAddress?: string | undefined
  isInvalidResolverAddress?: boolean | undefined
  reverseResolverAddress?: string | undefined
}

type FormattedProfile = {
  name: string
  address: string
  avatar: string | null
  records: {
    [key: string | number]: string
  }
}

async function encodeAvatar(
  name: string,
  avatarRecord: string | undefined
): Promise<string | null> {
  if (!avatarRecord) return null

  if (avatarRecord.startsWith('http') || avatarRecord.startsWith('data')) {
    // if the avatar record is a URL or raw data, return it as-is to avoid an async call
    return avatarRecord
  } else if (avatarRecord.match(matcherIpfs)) {
    // if the avatar record is an IPFS hash, turn it into a URL
    try {
      return getIpfsLink(avatarRecord)
    } catch (err) {
      console.error(err)
      return null
    }
  } else {
    // sometimes we need an async call to get the avatar (e.g. if it's an NFT)
    return await avt.getAvatar(name, {
      jsdomWindow: window,
    })
  }
}

const matcherIpfs = new RegExp('^(ipfs)://(.*)$', 'i')
function getIpfsLink(link: string): string {
  if (link.match(/^ipfs:\/\/ipfs\//i)) {
    link = link.substring(12)
  } else if (link.match(/^ipfs:\/\//i)) {
    link = link.substring(7)
  } else {
    throw new Error('Invalid IPFS link')
  }

  return `https:/\/ipfs.io/ipfs/${link}`
}
