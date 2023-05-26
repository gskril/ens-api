import { EnsjsProfile, FormattedProfile } from './types.js'
import { AvatarResolver } from '@ensdomains/ens-avatar'
import { JSDOM } from 'jsdom'
import { provider } from './provider.js'

const window = new JSDOM().window
const avt = new AvatarResolver(provider)
const matcherIpfs = new RegExp('^(ipfs)://(.*)$', 'i')
const zeroAddress = '0x0000000000000000000000000000000000000000'

export async function formatProfile(
  profile: EnsjsProfile,
  addressOrName: string
): Promise<FormattedProfile> {
  // Return empty object if no profile
  if (
    profile.resolverAddress === zeroAddress ||
    profile.message === "Name doesn't have a resolver"
  ) {
    return {}
  }

  // Fill in the name or address from the request (ensjs doesn't return it)
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
        acc![record.key] = record.value
        return acc
      }, {} as FormattedProfile['records']) || {},
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

export function getIpfsLink(link: string): string {
  if (link.match(/^ipfs:\/\/ipfs\//i)) {
    link = link.substring(12)
  } else if (link.match(/^ipfs:\/\//i)) {
    link = link.substring(7)
  } else {
    throw new Error('Invalid IPFS link')
  }

  return `https:/\/ipfs.io/ipfs/${link}`
}
