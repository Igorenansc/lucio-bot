import { useMainPlayer } from 'discord-player';
import { ClientApplication, CommandInteraction } from "discord.js";
import playerMessage from '../utils/playerMessage.js';
import queueMessage from '../utils/queueMessage.js';

/**
 * @param { ClientApplication } client
 * @param { CommandInteraction } interaction
 */
export default async (client, interaction) => {
  if (interaction.isCommand()) {
    try {
      return client.commands.get(interaction.commandName)?.run(client, interaction);
    } catch (e) {
      console.log(e);
      return interaction.reply({ content: "Ocorreu um erro ao executar o comando!"});
    }
  }

  if (interaction.isButton() && interaction?.customId?.startsWith('music_')) {
    const player = useMainPlayer();
    const queue = player.nodes.get(interaction.guild);
    const type = interaction.customId.substring(6);
    
    if (interaction.member?.voice?.channel?.id === queue?.channel?.id && queue) {
      try {
        switch (type) {
          case 'skip':
            queue.node.skip();
            break;

          case 'stop':
            playerMessage.delete(queue);
            queue.delete();
            break;

          case 'play_pause':
            queue.node[queue.node.isPaused() ? 'resume' : 'pause']();
            break;

          case 'refresh':
            await playerMessage.delete(queue);
            const { currentTrack } = queue;
            await playerMessage.create(queue, currentTrack);
            break;

          case 'queue':
            const embed = queueMessage(queue);
            return interaction.reply({ embeds: [embed], ephemeral: true })

          case 'volume_down':
            queue.node.setVolume(queue.node.volume * (2.0/3.0));
            break;

          case 'volume_up':
            queue.node.setVolume(queue.node.volume * 1.5);
            break;

          default:
            break;
        }
      } catch (e) {
        console.log(e);
      }      
      return interaction.deferUpdate();
    }
    return interaction.reply({ content: 'Você precisa estar no mesmo canal de voz que o bot para interagir com os botões!', ephemeral: true });
  }
}