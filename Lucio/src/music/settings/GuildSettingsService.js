const DEFAULT_VOLUME = 10

export default class GuildSettingsService {
  constructor ({ defaultVolume = DEFAULT_VOLUME } = {}) {
    this.defaultVolume = defaultVolume

    this.settings = new Map()
  }

  get (guildId) {
    const settings = this.settings.get(guildId) ?? {}

    return {
      volume: settings.volume ?? this.defaultVolume
    }
  }

  setVolume (guildId, volume) {
    const normalized = Math.max(0, Math.min(100, Number(volume)))

    if (!Number.isFinite(normalized)) {
      return this.get(guildId).volume
    }

    this.#update(guildId, {
      volume: normalized
    })

    return normalized
  }

  #update (guildId, patch) {
    this.settings.set(guildId, {
      ...this.get(guildId),
      ...patch
    })
  }
}
