import { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } from '@discordjs/voice';
import 'ffmpeg-static';
import { Client } from "youtubei";
import ytdl from "ytdl-core";
import store from "../../redux/store.js";

// const FFMPEG_OPTIONS = { before_options: '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5', options: '-vn' };
// const FFMPEG_OPTIONS = ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5'];

const isUrl = (str) => /^(?:(?:https?):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%&.]+$/.test(str);

export const parse_duration = (seconds) => {
  const mins = Math.floor(Number(seconds) / 60);
  const secs = Math.floor(Number(seconds) % 60);
  return mins < 60
    ? `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const search_yt = async (query, vc) => {
  // searching the item on youtube
  try {
    const youtube = new Client();
    const response = [];

    if (!query.includes("youtube.com/playlist")) {
      const { id, title, duration } = (isUrl(query)) ? await youtube.findOne(query, { type: 'video' }) 
        : (await youtube.search(query, { type: 'video' })).items[0];
      // await youtube.findOne(query, {
      //   type: "video",
      // });

      response.push([{ id, title, duration }, vc]);
    } else {
      const playlistId = query.split("=")[1];
      const { videos: { items } } = await youtube.getPlaylist(playlistId);

      items.forEach(({ id, title, duration }) =>
        response.push([{ id, title, duration }, vc])
      );
    }

    return response;
  } catch (e) {
    console.log(e.message);
    return false;
  }
};

export const playMusic = async () => {
  const queue = store.getState().playlist;
  if (queue.length) {
    try {
      await store.dispatch({ type: 'PLAY_TRACK' })
  
      const { currentTrack: nowPlaying, player: storedPlayer, connection: storedConnection } = store.getState();
      // const nowPlaying = store.getState().currentTrack;
      // const storedPlayer = store.getState().player;
      // const storedConnection = store.getState().connection;
      const vcInfo = nowPlaying[1];
  
      
      const musicInfo = (await ytdl.getInfo(nowPlaying[0].id)).formats.find(f => f.itag === 140)
      const url = musicInfo.url
      
      const connection = (!storedConnection) ? joinVoiceChannel(vcInfo) : storedConnection;


      // Disconnect bug fix by vittee
      // https://github.com/discordjs/discord.js/issues/9185#issuecomment-1452510633
      if (!storedConnection) {
        connection.on('stateChange', (oldState, newState) => {
          const oldNetworking = Reflect.get(oldState, 'networking');
          const newNetworking = Reflect.get(newState, 'networking');
        
          const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
            const newUdp = Reflect.get(newNetworkState, 'udp');
            clearInterval(newUdp?.keepAliveInterval);
          }
        
          oldNetworking?.off('stateChange', networkStateChangeHandler);
          newNetworking?.on('stateChange', networkStateChangeHandler);
          if (oldState.status === connection.Ready && newState.status === connection.Connecting) {
            connection.configureNetworking();
          }
        });
      }
      
      let player = (!storedPlayer) ? createAudioPlayer() : storedPlayer;
      
      // const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

      const audioResource = createAudioResource(url, { 
        inlineVolume: true, 
        silencePaddingFrames: 5, 
        silencePaddingDuration: 5000,
      });
      
      try {
        player.play(audioResource);
      } catch (e) {
        console.log(e.message);
        return await playMusic();
      }
      
      if (!storedConnection) {
        connection.subscribe(player);
        
        player.on(AudioPlayerStatus.Playing, async () => await store.dispatch({ type: 'SET_CONNECTION', payload: { vc: connection, player } }))
        player.on(AudioPlayerStatus.Idle, async () => await playMusic());  
      }
      
    } catch (e) {
      console.log(e.message);
      return true;
    }
  } else {
    // const connection = store.getState().connection;
    await store.dispatch({ type: 'STOP_PLAYING' })
  }
};

export const data = {
  name: "p",
  description: "Transmite um vídeo do youtube.",
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

  try {
    const voiceChannel = interaction.member.voice.channel;
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
    const query = interaction.options
      ? interaction.options.getString("busca", true)
      : interaction.content.slice(3).trim();

    if (!interaction.member.voice.channel) return ((isLegacy) ? reply : interaction)[edit]({ content: "Para tocar uma música, primeiro se conecte a um canal de voz." })

    const voiceChannel = {
      channelId: interaction.member.voice.channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    };

    // await store.dispatch({ type: 'SET_VOICE_CHANNEL', payload: interaction.member.voice.channel });
    const songs = await search_yt(query, voiceChannel);

    // joinVoiceChannel(voiceChannel);

    if (!songs) return ((isLegacy) ? reply : interaction)[edit]({ content: 'Algo deu errado! Tente mudar ou configurar a playlist/vídeo ou escrever o nome dele novamente!'})
    
    let response;
    await store.dispatch({ type: "ADD_TRACKS", payload: songs });
    response =
      songs.length > 1
        ? `**${songs.length}** músicas adicionadas à fila!`
        : `**${songs[0][0].title} - [${parse_duration(songs[0][0].duration)}]** foi adicionado à fila!`;

    const isPlaying = store.getState().isPlaying;

    let err;
    if (!isPlaying) err = await playMusic();
    if (err) throw new Error({ message: 'Deu algo errado ao chamar a função playMusic' });

    return ((isLegacy) ? reply : interaction)[edit]({ content: response });
  } catch (e) {
    console.log(e.message);
    return ((isLegacy) ? reply : interaction)[edit]('Algo deu errado! Tente mudar ou configurar a playlist/vídeo ou escrever o nome dele novamente!');
  }
}
