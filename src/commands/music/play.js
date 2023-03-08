import { QueryType } from "discord-player";
import store from "../../redux/store.js";

const queryType = (string) => {
  const urlRegex = /^(?:(?:https?):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%&.]+$/

  // Entra no if caso seja uma url
  if (urlRegex.test(string)) return (string.includes("youtube.com/playlist")) ? 'PLAYLIST' : 'VIDEO'

  return 'SEARCH'
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
  if (!client.owners.includes(interaction.member.id)) return interaction.reply({ content: `Você não tem permissão para usar esse comando.` });

  const isLegacy = !interaction?.options
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });
    
  const edit = (isLegacy) ? 'edit' : 'editReply';

  let voiceChannel;
  
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
    const query = (interaction.options)
      ? interaction.options.getString("busca", true)
      : interaction.content.slice(3).trim();
    
    const { player: storedQueue } = store.getState();

    const queue = (!storedQueue) ? await client.player.createQueue(interaction.guild, {
      autoSelfDeaf: true,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 300000,
      leaveOnEnd: true,
      leaveOnEndCooldown: 300000,
    }) : player;
    // const queue = await client.player.createQueue(interaction.guild);
    
    if (!storedQueue) {
      store.dispatch({ type: 'SET_QUEUE', payload: queue });
    }
    
    if (!queue.connection) await queue.connect(voiceChannel);
    
    const type = queryType(query);
    const result = await client.player.search(query, {
      requestedBy: interaction.member,
      searchEngine: QueryType[`YOUTUBE_${type}`],
    });

    if (result.tracks.length === 0) return ((isLegacy) ? reply : interaction)[edit]({ content: 'Não obtive resultados.' });

    const song = (type === 'PLAYLIST') ? result.tracks : result.tracks[0];
    await queue[(type === 'PLAYLIST') ? 'addTracks' : 'addTrack'](song);
    
    if (!queue.playing) await queue.play();
    
    const message = { content: `${(type === 'PLAYLIST') ? `Uma playlist com **${song.length}** músicas foi` : `**${song.title} - [${song.duration}]**` } adicionada!` };
    return ((isLegacy) ? reply : interaction)[edit](message);
    
    } catch (e) {
    console.log(e.message);
    return ((isLegacy) ? reply : interaction)[edit]({ content: 'Algo deu errado!' });
  }
}