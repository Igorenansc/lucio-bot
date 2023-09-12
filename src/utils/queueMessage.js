export default function (queue) {
  const queueStr = queue.tracks.data.slice(0, 10).map((music, i) => {
    return `**${i + 1} - ** ${music.title} - ${music.duration}`;
  }).join("\n");

  const tracksQueue = `${queueStr} ${((queue.tracks.data.length - 10) > 0) ? `\n e mais ${queue.tracks.data.length - 10}...` : ""}`

  const repeatMode = {
    0: ":play_pause: OFF",
    1: ":repeat_one: TRACK",
    2: ":repeat: QUEUE",
    3: ":infinity: AUTOPLAY",
  }

  const embed = {
    color: 3066993,
    fields: [
      {
        name: ":musical_note: Tocando Agora",
        value: `${queue.currentTrack.title}\n${queue.node.createProgressBar()}\n`,
        inline: true,
      },
      {
        name: ":loud_sound: Play Mode",
        value: repeatMode[queue.repeatMode],
        inline: true,
      },
      {
        name: ":notes: Queue",
        value: tracksQueue,
        inline: false,
      }
    ],
  }

  return embed;
}
