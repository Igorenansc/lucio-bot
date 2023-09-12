const createPlayerMessage = async (queue, track) => {
  const { metadata: { channel, isFirstInteraction } } = queue;

  const playPauseButton = {
    type: 2,
    custom_id: "music_play_pause",
    label: "Pausar / Retomar",
    style: 2,
  };

  const stopButton = {
    type: 2,
    custom_id: "music_stop",
    label: "Parar",
    style: 4,
  }

  const skipButton = {
    type: 2,
    custom_id: "music_skip",
    label: "Pular",
    style: 1,
  }

  const volumeUpButton = {
    type: 2,
    custom_id: "music_volume_up",
    label: "Vol +",
    style: 3,
  };

  const volumeDown = {
    type: 2,
    custom_id: "music_volume_down",
    label: "Vol -",
    style: 3,
  };

  const refreshButton = {
    type: 2,
    custom_id: "music_refresh",
    label: " ↻ ",
    style: 2,
  };

  const queueButton = {
    type: 2,
    custom_id: "music_queue",
    label: " 🖥 ",
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
    url: track.url,
    thumbnail: {
      url: track.thumbnail,
    },
    description: `\`[0:00] / [${track.duration}]\``,
    footer: {
      text: `${track.views} visualizações`,
    },
  };

  try {
    if (isFirstInteraction) {      
      const message = await channel.send({ embeds: [playing], components: [actionRow1, actionRow2] });
      queue.metadata.message = message;
      queue.metadata.isFirstInteraction = false;
    } else {
      queue.metadata.message.edit({ embeds: [playing], components: [actionRow1, actionRow2] });
    }
  } catch (e) {
    console.log(e.message);
  }
}

const deletePlayerMessage = async (queue) => {
  const { metadata: { message } } = queue;
  try {
    await message.delete();
  } catch {
    console.log("Already deleted");
  }
  queue.metadata.isFirstInteraction = true;
}

const playerMessage = { create: createPlayerMessage, delete: deletePlayerMessage };

export default playerMessage;
