import { SearchType } from './SearchType.js'

export default class AutocompleteService {
  constructor (
    searchProvider,
    { minQueryLength = 3, debounceMs = 250, cacheTtl = 30_000, limit = 10 } = {}
  ) {
    this.searchProvider = searchProvider

    this.minQueryLength = minQueryLength

    this.debounceMs = debounceMs

    this.cacheTtl = cacheTtl

    this.limit = limit

    this.cache = new Map()

    this.generations = new Map()

    this.pending = new Map()
  }

  async search (key, query, type = SearchType.VIDEO) {
    const normalized = query?.trim().toLowerCase()

    if (!normalized || normalized.length < this.minQueryLength) {
      return []
    }

    const generation = (this.generations.get(key) ?? 0) + 1

    this.generations.set(key, generation)

    /*
     * O tipo precisa fazer parte da
     * cache key.
     *
     * "daft punk/video" e
     * "daft punk/playlist"
     * são resultados diferentes.
     */
    const cacheKey = `${type}:${normalized}`

    const cached = this.#getCached(cacheKey)

    if (cached) return cached

    await this.#delay(this.debounceMs)

    if (this.generations.get(key) !== generation) {
      return []
    }

    let request = this.pending.get(cacheKey)

    if (!request) {
      request = this.searchProvider.search(normalized, type, this.limit)

      this.pending.set(cacheKey, request)
    }

    try {
      const results = await request

      this.cache.set(cacheKey, {
        results,

        expiresAt: Date.now() + this.cacheTtl
      })

      if (this.generations.get(key) !== generation) {
        return []
      }

      return results
    } finally {
      if (this.pending.get(cacheKey) === request) {
        this.pending.delete(cacheKey)
      }
    }
  }

  #getCached (query) {
    const entry = this.cache.get(query)

    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(query)

      return null
    }

    return entry.results
  }

  #delay (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
