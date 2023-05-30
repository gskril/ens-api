import 'dotenv/config'

import { getEnsProfile } from '../handlers/ens-profile.js'
import { formatProfile } from '../utils.js'

const testInputs = [
  '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // contract without primary ENS
  '0x253553366Da8546fC250F225fe3d25d0C782303b', // contract with primary ENS
  '0x0000000000000000000000000000000000000000', // empty EOA
  '001.doodle.nft-owner.eth', // onchain .eth with wildcard
  'hi.offchainexample.eth', // offchain .eth with wildcard
  'offchaindemo.eth', // offchain .eth
  'ensiscool.cb.id', // offchain DNS
  'ensfairy.xyz', // onchain DNS
  '0x1234', // invalid address
  'hi yo', // invalid name
  'hi', // invalid name
]

for (const input of testInputs) {
  const profile = await testProfile(input)
  console.log(input, profile, '\n')
}

async function testProfile(addressOrName: string) {
  const profile = await getEnsProfile(addressOrName)
  const formattedProfile = await formatProfile(profile, addressOrName)
  return formattedProfile
}
