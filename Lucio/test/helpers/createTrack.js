export function createTrack (
  id,
  { title = `Track ${id}`, author = 'Test Artist', length = 180_000 } = {}
) {
  return {
    encoded: `encoded-${id}`,

    info: {
      identifier: id,
      title,
      author,
      length,
      isSeekable: true,
      isStream: false,
      position: 0,
      uri: `https://youtube.com/watch?v=${id}`,
      sourceName: 'youtube',
      artworkUrl: null,
      isrc: null
    },

    pluginInfo: {},

    userData: {}
  }
}
