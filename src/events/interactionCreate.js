import playerMessage from "../utils/playerMessage.js";
import queueMessage from "../utils/queueMessage.js";

export default async (client, interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      try {
        await command.autocomplete(interaction);
        // await command.autocompleteRun(interaction);
      } catch (e) {
        console.error(e);
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
        const type = interaction.customId.substring(6);

        const { player } = (client[interaction.guild.id]?.player) ? client[interaction.guild.id] : { player: null };
        if ((interaction.member?.voice?.channel?.id === player?.voiceId) && player) {
          try {
            switch (type) {
              case "skip":
                player.skip();
                break;

              case "stop":
                playerMessage.delete(player);
                player.delete();
                break;

              case "play_pause":
                if (!player.paused) {
                  player.metadata.trackStart.pausedTime = Date.now();
                } else {
                  player.metadata.trackStart.time += (Date.now() - player.metadata.trackStart.pausedTime);
                }
                player.pause(!player.paused);
                break;

              case "queue":
                const message = queueMessage(player);
                return interaction.reply({ ...message });

              case "refresh":
                await playerMessage.delete(player);
                await playerMessage.create(player, player.queue.current);
                break;

              case "volume_down":
                await player.setVolume(Math.round(player.volume * (2.0 / 3.0)));
                break;

              case "volume_up":
                const newVolume = Math.round(player.volume * (3.0 / 2.0));
                await player.setVolume((newVolume >= 2) ? newVolume : 2);
                break;

              default:
                break;
            }
          } catch (e) {
            console.log(e);
          }
          return interaction.deferUpdate();
        }
        if (!player) {
          await interaction.message.delete();
          return interaction.deferUpdate();
        }
        return interaction.reply({ content: "Você precisa estar no mesmo canal de voz que o bot para interagir com os botões!", ephemeral: true });
      }

      if (interaction?.customId?.startsWith("queue_message_")) {
        const messageValues = interaction.message.embeds[0].fields[1].value.split("\n");

        const { player } = (client[interaction.guild.id]?.player) ? client[interaction.guild.id] : { player: null };
        const type = interaction.customId.substring(14);

        try {
          if (!player) {
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
              interaction.channel.send(queueMessage(player));
              return interaction.deferUpdate();
            default:
              break;
          }

          const message = queueMessage(player, (typeof initialIndex !== 'number') ? 0 : initialIndex);
          await interaction.message.edit(message);

          return interaction.deferUpdate();
        } catch (e) {
          console.log(e);
          return interaction.deferUpdate();
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
}
