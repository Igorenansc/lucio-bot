import { useMainPlayer } from "discord-player";
import { ClientApplication, CommandInteraction } from "discord.js";
import playerMessage from "../utils/playerMessage.js";
import queueMessage from "../utils/queueMessage.js";

/**
 * @param { ClientApplication } client
 * @param { CommandInteraction } interaction
 */
export default async (client, interaction) => {
  if (interaction.isAutocomplete()) {
		const command = client.commands.get(interaction.commandName);
		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
		}
	}

  if (interaction.isCommand()) {
    try {
      return client.commands.get(interaction.commandName)?.run(client, interaction);
    } catch (e) {
      console.log(e);
      return interaction.reply({ content: "Ocorreu um erro ao executar o comando!"});
    }
  }

  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    if (interaction?.customId?.startsWith("music_")) {
      const player = useMainPlayer();
      const queue = player.nodes.get(interaction.guild);
      const type = interaction.customId.substring(6);

      if ((interaction.member?.voice?.channel?.id === queue?.channel?.id) && queue) {
        try {
          switch (type) {
            case "skip":
              queue.node.skip();
              break;

            case "stop":
              playerMessage.delete(queue);
              queue.delete();
              break;

            case "play_pause":
              queue.node[queue.node.isPaused() ? "resume" : "pause"]();
              break;

            case "refresh":
              await playerMessage.delete(queue);
              const { currentTrack } = queue;
              await playerMessage.create(queue, currentTrack);
              break;

            case "queue":
              const message = queueMessage(queue);
              return interaction.reply({ ...message })

            case "volume_down":
              queue.node.setVolume(queue.node.volume * (2.0 / 3.0));
              break;

            case "volume_up":
              const newVolume = queue.node.volume * (3.0 / 2.0);
              queue.node.setVolume((newVolume >= 2) ? newVolume : 2);
              break;

            default:
              break;
          }
        } catch (e) {
          console.log(e);
        }
        return interaction.deferUpdate();
      }
      return interaction.reply({ content: "Você precisa estar no mesmo canal de voz que o bot para interagir com os botões!", ephemeral: true });
    }

    if (interaction?.customId?.startsWith("queue_message_")) {
      const messageValues = interaction.message.embeds[0].fields[2].value.split("\n");

      const player = useMainPlayer();
      const queue = player.nodes.get(interaction.guild);
      const type = interaction.customId.substring(14);

      try {
        if (!queue) {
          await interaction.message.delete();
          return interaction.deferUpdate();
        }

        let initialIndex = 0;

        switch (type) {
          case "next":
            initialIndex = Number(messageValues[messageValues.length - 1].split(" - **")[0].replace("**", ""));
            break;
          case "previous":
            initialIndex = Number(messageValues[0].split(" - **")[0].replace("**", "")) - 11;
            break;
          case "page":
            initialIndex = Number(interaction.values[0]);
            break;
          case "remove":
            await interaction.message.delete();
            return interaction.deferUpdate();
          case "refresh":
            await interaction.message.delete();
            interaction.channel.send(queueMessage(queue));
            return interaction.deferUpdate();
          default:
            break;
        }

        const message = queueMessage(queue, (typeof initialIndex !== 'number') ? 0 : initialIndex);
        await interaction.message.edit(message);

        return interaction.deferUpdate();
      } catch (e) {
        console.log(e);
        return interaction.deferUpdate();
      }
    }
  }
}
