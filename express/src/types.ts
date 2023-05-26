import { DecodedContentHash } from '@ensdomains/ensjs/utils/contentHash'

export type EnsjsProfile = {
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

export type FormattedProfile = {
  name?: string
  address?: string
  avatar?: string | null
  records?: {
    [key: string | number]: string
  }
}
