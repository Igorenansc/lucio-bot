import fetch from "isomorphic-unfetch";
import { parseDuration } from "../../utils/queueMessage.js";
import { Innertube } from "youtubei.js";

const parseQuery = async (string) => {
  let query = string;
  if (query.includes("spotify.link")) query = (await fetch(query)).url;
  if (query.includes("youtu.be")) {
    let aux = query.split('/');
    aux = aux[aux.length - 1];
    return `https://www.youtube.com/watch?v=${aux.includes('?') ? aux.split('?')[0] : aux}`;
  }
  return query;
}

const queryType = async (string) => {
  const urlRegex = /^(?:(?:https?):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%&.]+$/;

  if (string.includes("open.spotify.com")) {
    const suffix = string.split("open.spotify.com")[1].split("/")[1].toUpperCase();

    return `SPOTIFY_${(suffix === "TRACK") ? "SONG" : suffix }`;
  }
  if (urlRegex.test(string)) return (string.includes("youtube.com/playlist")) ? "YOUTUBE_PLAYLIST" : "YOUTUBE_VIDEO";

  return "YOUTUBE_SEARCH";
};

export const data = {
  name: "p",
  description: "Toca uma música no canal de voz atual.",
  options: [
    {
      name: "busca",
      description: "Digite o nome/link da música no YouTube.",
      required: true,
      type: 3,
    },
  ],
};
export async function run(client, interaction) {
  const isLegacy = !interaction?.options
  const reply = (isLegacy)
    ? await interaction.reply({ content: "Lúcio está pensando..."})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";

  let voiceChannel;

  try {
    voiceChannel = interaction.member.voice.channel;
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has("Speak") || !permissions.has("Connect")) {
      return ((isLegacy) ? reply : interaction)[edit]({ content: "Eu não possuo permissão para entrar ou falar." });
    }
  } catch (e) {
    console.log(e.message);
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Você precisa estar conectado a um chat de voz!" });
  }

  try {
    let query = (isLegacy)
      ? interaction.content.slice(3).trim()
      : interaction.options.getString("busca", true);

    // Get the current player
    let { player } = (client[interaction.guild.id]?.player) ? client[interaction.guild.id] : { player: null };

    // Check if the user is in the same voice channel as the bot
    if (player && interaction.member.voice.channel.id !== player.voiceId) {
      return ((isLegacy) ? reply : interaction)[edit]({ content: "Você precisa estar no mesmo canal de voz que eu para utilizar esse comando." });
    }


    if (!player) {
      player = await client.manager.createPlayer({
        guildId: interaction.guild.id,
        voiceId: interaction.member.voice.channel.id,
        textId: interaction.channel.id,
        volume: client.baseVolume,
        deaf: true,
      });

      player.metadata = {
        ...player.metadata,
        autoplay: true,
        channel: interaction.channel,
        isFirstInteraction: true,
        message: null,
      };

      player.youtubeClient = await Innertube.create({ retrieve_player: false });

      const deletePlayer = async (client) => {
        await player.destroy();
        client[interaction.guild.id].player = null;
      }

      player.delete = deletePlayer.bind(null, client);
      player.search = client.manager.search.bind(client.manager); // Bind the search method to the player
      player.toggleAutoPlay = ((pl) => pl.metadata.autoplay = !pl.metadata.autoplay).bind(null, player);

      client[interaction.guild.id] = { player };
    }


    const res = await client.manager.search(
      query,
      {
        requester: interaction[(isLegacy) ? "author" : "user"],
        engine: "youtube",
      },
    );

    const { type, tracks, playlistName } = res;

    if (!tracks.length) return ((isLegacy) ? reply : interaction)[edit]({ content: "Nenhum resultado encontrado!" });

    let message;
    const isPlaylist = type === "PLAYLIST";

    player.queue.add((isPlaylist) ? tracks : tracks[0]); // Add the first track from the search results
    message = {
      content: `${(isPlaylist) ? `A playlist **${playlistName}** com **${tracks.length}** músicas foi` : `**${tracks[0].title} - ${(tracks[0].isStream ? `[AO VIVO]` : `[${parseDuration(tracks[0].length)}]`)}**` } adicionada!`
    };

    // if (!player.isAutoplay) await player.autoplay(player);
    if (!player.playing && !player.paused) player.play();

    // if (!player.playing && !player.paused && player.queue.size === tracks.length) await player.play();

    return ((isLegacy) ? reply : interaction)[edit](message);

  } catch (e) {
    console.log("Error in /play:", e);
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Algo deu errado!" });
  }
}
