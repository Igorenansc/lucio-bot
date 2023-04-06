import { QueryType, useMasterPlayer } from "discord-player";

const queryType = (string) => {
  const urlRegex = /^(?:(?:https?):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%&.]+$/

  // Entra no if caso seja uma url
  if (string.includes('open.spotify.com')) {
    const suffix = string.split('open.spotify.com')[1].split('/')[1].toUpperCase();

    return `SPOTIFY_${(suffix === 'TRACK') ? 'SONG' : suffix }`
  }
  if (urlRegex.test(string)) return (string.includes("youtube.com/playlist")) ? 'YOUTUBE_PLAYLIST' : 'YOUTUBE_VIDEO'

  return 'YOUTUBE_SEARCH'
};

export const data = {
  name: "p",
  description: "Comando play em desenvolvimento, pode conter bugs.",
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
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });
    
  const edit = (isLegacy) ? 'edit' : 'editReply';

  let voiceChannel;
  const player = useMasterPlayer();

  try {
    voiceChannel = interaction.member.voice.channel;
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has('Speak') || !permissions.has('Connect')) {
      return ((isLegacy) ? reply : interaction)[edit]({ 
        content: "Eu não possuo permissão para entrar ou falar."
      });
    }
  } catch (e) {
    console.log(e.message);
    return ((isLegacy) ? reply : interaction)[edit]({ content: 'Você precisa estar conectado a um chat de voz!' });
  }
  
  try {
    const query = (isLegacy)
      ? interaction.content.slice(3).trim()
      : interaction.options.getString("busca", true);

      const queue = player.nodes.create(interaction.guild, {
      metadata: {
        channel: interaction.channel,
        client: interaction.guild.members.me,
        requestedBy: interaction.user,
      },
      selfDeaf: true,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 10000,
      leaveOnEnd: true,
      leaveOnEndCooldown: 3000000,
    });
    // const queue = await client.player.createQueue(interaction.guild, {
    //   autoSelfDeaf: true,
    //   leaveOnEmpty: true,
    //   leaveOnEmptyCooldown: 10000,
    //   leaveOnEnd: true,
    //   leaveOnEndCooldown: 300000,
    // });
    
    if (!queue.connection) await queue.connect(voiceChannel);
    
    const listTypes = ['YOUTUBE_PLAYLIST', 'SPOTIFY_ALBUM', 'SPOTIFY_PLAYLIST'];
    const type = queryType(query);
    const result = await player.search(query, {
      requestedBy: interaction.member,
      searchEngine: QueryType[type],
    });

    if (!result.hasTracks()) return ((isLegacy) ? reply : interaction)[edit]({ content: 'Não obtive resultados.' });

    const song = (listTypes.includes(type)) ? result.tracks : result.tracks[0];
    queue.addTrack(song);
    
    if (!queue.node.isPlaying()) await queue.node.play();
    
    const message = { content: `${(listTypes.includes(type)) ? `Uma playlist com **${song.length}** músicas foi` : `**${song.title} - [${song.duration}]**` } adicionada!` };
    return ((isLegacy) ? reply : interaction)[edit](message);
    
    } catch (e) {
    console.log(e);
    return ((isLegacy) ? reply : interaction)[edit]({ content: 'Algo deu errado!' });
  }
}