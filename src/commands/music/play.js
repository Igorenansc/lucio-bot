import { QueryType, QueueRepeatMode, useMainPlayer } from "discord-player";
import "ffmpeg";
import "ffmpeg-static";

const queryType = (string) => {
  const urlRegex = /^(?:(?:https?):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%&.]+$/

  // Entra no if caso seja uma url
  if (string.includes("open.spotify.com")) {
    const suffix = string.split("open.spotify.com")[1].split("/")[1].toUpperCase();

    return `SPOTIFY_${(suffix === "TRACK") ? "SONG" : suffix }`
  }
  if (urlRegex.test(string)) return (string.includes("youtube.com/playlist")) ? "YOUTUBE_PLAYLIST" : "YOUTUBE_VIDEO"

  return "YOUTUBE_SEARCH"
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
  const player = useMainPlayer();

  try {
    voiceChannel = interaction.member.voice.channel;
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has("Speak") || !permissions.has("Connect")) {
      return ((isLegacy) ? reply : interaction)[edit]({ 
        content: "Eu não possuo permissão para entrar ou falar."
      });
    }
  } catch (e) {
    console.log(e.message);
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Você precisa estar conectado a um chat de voz!" });
  }
  
  try {
    const query = (isLegacy)
      ? interaction.content.slice(3).trim()
      : interaction.options.getString("busca", true);
    const nodeAlreadyCreated = player.nodes.has(interaction.guild.id);
    const queue = (nodeAlreadyCreated) 
      ? player.nodes.get(interaction.guild.id) 
      : player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
          isFirstInteraction: true,
        },
        disableHistory: true,
        repeatMode: QueueRepeatMode["AUTOPLAY"],
        selfDeaf: true,
        skipOnNoStream: true,
        volume: client.volume || 2,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 10000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 3000000,
      });

      if (!queue.connection) await queue.connect(voiceChannel);
      if (nodeAlreadyCreated) {
        if (voiceChannel.id !== queue.channel.id) {
          return ((isLegacy) ? reply : interaction)[edit]({ 
            content: "Você precisa estar no mesmo canal de voz que eu."
          });
        }
        queue.metadata.interaction = interaction;
      }

    const listTypes = ["YOUTUBE_PLAYLIST", "SPOTIFY_ALBUM", "SPOTIFY_PLAYLIST"];
    const type = queryType(query);
    const result = await player.search(query, {
      requestedBy: interaction.member || interaction.member.me,
      searchEngine: QueryType[type],
    });

    if (!result.hasTracks()) return ((isLegacy) ? reply : interaction)[edit]({ content: "Não obtive resultados." });

    const song = (listTypes.includes(type)) ? result.tracks : result.tracks[0];
    queue.addTrack(song);

    if (!queue.node.isPlaying() && !queue.node.isPaused()) queue.node.play();

    const message = { 
      content: `${(listTypes.includes(type)) ? `A playlist **${song[0].playlist.title}** com **${song.length}** músicas foi` : `**${song.title} - [${song.duration}]**` } adicionada!`
    };
    return ((isLegacy) ? reply : interaction)[edit](message);

    } catch (e) {
    console.log(e);
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Algo deu errado!" });
  }
}