export const data = {
  name: "pause",
  description: "Pausa/retoma a música tocando atualmente",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy)
    ? await interaction.reply({ content: "Lúcio está pensando..."})
    : await interaction.deferReply({ ephemeral: true, fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";

  const { player } = (client[interaction.guild.id]?.player) ? client[interaction.guild.id] : { player: null };;
  if (!player) return ((isLegacy) ? reply : interaction)[edit]("Não há música tocando no momento.");

  try {
    if (interaction.member.voice.channel.id !== player.voiceId) {
      return ((isLegacy) ? reply : interaction)[edit]({
        content: "Você precisa estar no mesmo canal de voz que eu."
      });
    }
  } catch (e) {
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Você precisa estar conectado a um chat de voz!" });
  }

  if (!player.paused) {
    player.metadata.trackStart.pausedTime = Date.now();
  } else {
    player.metadata.trackStart.time += (Date.now() - player.metadata.trackStart.pausedTime);
  }

  player.pause(!player.paused);

  return ((isLegacy) ? reply : interaction)[edit]({ content: (player.paused) ? "Música pausada!" : "Música retomada!" });
}
