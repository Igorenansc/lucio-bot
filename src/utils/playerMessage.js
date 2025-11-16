import { parseDuration } from "./queueMessage.js";

const createPlayerMessage = async (player, track) => {
  const { metadata: { channel, isFirstInteraction } } = player;

  const playPauseButton = {
    type: 2,
    custom_id: "music_play_pause",
    label: "Pausar / Retomar",
    style: 2,
  };

  const stopButton = {
    type: 2,
    custom_id: "music_stop",
    label: "Parar‎",
    style: 4,
  }

  const skipButton = {
    type: 2,
    custom_id: "music_skip",
    label: "Pular",
    style: 1,
  }

  // that crazyness of characters on the labels are to make the buttons larger using invisible characters and spaces
  const volumeUpButton = {
    type: 2,
    custom_id: "music_volume_up",
    label: "‎ ‎Vol +‎ ‎",
    style: 3,
  };

  const volumeDown = {
    type: 2,
    custom_id: "music_volume_down",
    label: "‎ Vol -‎ ",
    style: 3,
  };

  const refreshButton = {
    type: 2,
    custom_id: "music_refresh",
    label: "‎ ‎ ‎ ‎↻‎ ‎ ‎ ‎ ",
    style: 2,
  };

  const queueButton = {
    type: 2,
    custom_id: "music_queue",
    label: "‎ ‎ ‎ 🖥‎ ‎ ‎ ",
    style: 2,
  };

  const actionRow1 = {
    type: 1,
    components: [playPauseButton, stopButton, skipButton],
  };

  const actionRow2 = {
    type: 1,
    components: [queueButton, refreshButton, volumeUpButton, volumeDown],
  };

  const playing  = {
    author: {
      name: track.author,
    },
    title: track.title,
    url: track.uri,
    thumbnail: {
      url: track.thumbnail,
    },
    description: (track.isStream) ? ":red_circle: **AO VIVO**" : `\`[0:00] / [${parseDuration(track.length)}]\``,
    /*
    footer: {
      text: `${track.views} visualizações`,
    },
    */
  };

  try {
    if (isFirstInteraction || !player.metadata?.message) {
      const message = await channel.send({ embeds: [playing], components: [actionRow1, actionRow2] });
      player.metadata.message = message;
      player.metadata.isFirstInteraction = false;
    } else {
      player.metadata.message.edit({ embeds: [playing], components: [actionRow1, actionRow2] });
    }
  } catch (e) {
    console.log(e.message);
  }
}

const deletePlayerMessage = async (player) => {
  try {
    player.metadata.isFirstInteraction = true;
    await player.metadata.message.delete();
  } catch (e) {
    console.log("Already deleted");
  }
}

const playerMessage = { create: createPlayerMessage, delete: deletePlayerMessage };

export default playerMessage;
