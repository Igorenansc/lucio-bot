import LavalinkNodeResolver from './LavaLinkNodeResolver.js'

export default class TrackResolver {
  constructor (shoukaku) {
    this.shoukaku = shoukaku
  }

  async resolve (track) {
    if (!track) return null

    if (track.encoded) return track

    if (!track.info?.uri) return null

    const node = new LavalinkNodeResolver(this.shoukaku).getAvailableNode()

    const result = await node.rest.resolve(track.info.uri)

    if (result?.loadType !== 'track') {
      return null
    }

    return {
      ...result.data,

      userData: {
        ...result.data.userData,
        ...track.userData
      }
    }
  }
}
