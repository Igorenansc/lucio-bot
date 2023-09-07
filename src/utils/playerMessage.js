import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const createPlayerMessage = async (queue, track) => {
  const { metadata: { channel, isFirstInteraction } } = queue;

  const playPauseButton = new ButtonBuilder()
    .setCustomId('music_play_pause')
    .setLabel('Pausar / Retomar')
    .setStyle(ButtonStyle.Secondary);
  
  const stopButton = new ButtonBuilder()
    .setCustomId('music_stop')
    .setLabel('Parar')
    .setStyle(ButtonStyle.Danger);
  
  const skipButton = new ButtonBuilder()
    .setCustomId('music_skip')
    .setLabel('Pular')
    .setStyle(ButtonStyle.Primary);
    
    const volumeUpButton = new ButtonBuilder()
    .setCustomId('music_volume_up')
    .setLabel('Vol +')
    .setStyle(ButtonStyle.Success);
  
    const volumeDown = new ButtonBuilder()
    .setCustomId('music_volume_down')
    .setLabel('Vol -')
    .setStyle(ButtonStyle.Success);

  const refreshButton = new ButtonBuilder()
    .setCustomId('music_refresh')
    .setLabel(' ↻ ')
    .setStyle(ButtonStyle.Secondary);
  
  const queueButton = new ButtonBuilder()
    .setCustomId('music_queue')
    .setLabel(' 🖥 ')
    .setStyle(ButtonStyle.Secondary);

  const actionRow1 = new ActionRowBuilder().addComponents(
    playPauseButton, stopButton, skipButton
  );

  const actionRow2 = new ActionRowBuilder().addComponents(
    queueButton, refreshButton, volumeUpButton, volumeDown
  );

  const playing  = {
    'author': {
      'name': track.author,
    },
    'title': track.title,
    'url': track.url,
    'thumbnail': {
      'url': track.thumbnail,
    },
    'description': `\`[0:00] / [${track.duration}]\``,
    'footer': {
      'text': `${track.views} visualizações`,
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
    console.log('Already deleted');
  }
  queue.metadata.isFirstInteraction = true;
}

const playerMessage = { create: createPlayerMessage, delete: deletePlayerMessage };

export default playerMessage;
