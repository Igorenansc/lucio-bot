import { getYouTubeClient } from '../search/YouTubeClient.js'

export default class YouTubeRecommendationProvider {
  constructor (youtube) {
    this.youtube = youtube
  }

  static async create () {
    const youtube = await getYouTubeClient()

    return new YouTubeRecommendationProvider(youtube)
  }

  async getRelated (videoId) {
    const related = await this.youtube.music.getRelated(videoId)

    if (!related?.contents?.length) {
      return []
    }

    const shelf = related.contents.find(
      section =>
        section.type === 'MusicCarouselShelf' &&
        section.header?.title?.text === 'You might also like'
    )

    if (!shelf?.contents?.length) return []

    return shelf.contents
      .filter(
        item =>
          item.type === 'MusicResponsiveListItem' &&
          item.item_type === 'song' &&
          item.id
      )
      .map(item => ({
        videoId: item.id,
        title: item.title ?? null,
        artists:
          item.artists
            ?.map(artist => artist.name ?? artist.text)
            .filter(Boolean) ?? [],
        album: item.album?.name ?? null
      }))
  }

  async getAutoplayVideoId (videoId) {
    const info = await this.youtube.getInfo(videoId)

    return info.autoplay_video_endpoint?.payload?.videoId ?? null
  }
}
