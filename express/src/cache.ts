import NodeCache from 'node-cache'

export const cache = new NodeCache()
export const TTL = 5 * 60 // 5 minutes
