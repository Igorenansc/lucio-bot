import { Client } from "youtubei";
import playerMessage from "./playerMessage.js";

// const youtubeClient = new Client;
const youtubeUrl = "https://www.youtube.com/watch?v=";

export default async (player, lastVideoId, requester, manual = false) => {
  // const { metadata: { autoplay }, lastVideo } = player;
  if (lastVideoId && requester && player.metadata.autoplay) {
    // let { title, related } = await youtubeClient.getVideo(lastVideoId);
    let info = await player.youtubeClient.getInfo(lastVideoId);
    let nextVideoId = await info.autoplay_video_endpoint.payload.videoId;
    const { basic_info: { title } } = info;

    console.log(`Client luciov3: Last video ${title} - ${youtubeUrl + lastVideoId}`)
    if (nextVideoId && (nextVideoId !== lastVideoId)) {
      const { tracks: [recommended] } = await player.search(`${youtubeUrl + nextVideoId}`, { requester: requester,  engine: "youtube" });
      if (manual) {
        return await player.queue.add(recommended);
      } else {
        return await player.play(recommended);
      }
    } else {
      const songs = player.queue.previous
      const previous = songs[songs.length - 2]
      if (previous && previous.uri) {
        const id = previous.uri.split("watch?v=")[1];
        // let { related } = await youtubeClient.getVideo(id);
        info = await player.youtubeClient.getInfo(id);
        nextVideoId = await info.autoplay_video_endpoint.payload.videoId;

        if (nextVideoId) {
          const { tracks: [recommended] } = await player.search(`${youtubeUrl + nextVideoId}`, { requester: requester,  engine: "youtube" });
          if (manual) {
            return await player.queue.add(recommended);
          } else {
            return await player.play(recommended);
          }
        }
      }
    }
  } else {
    return await playerMessage.delete(player);
  }
}
