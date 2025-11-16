export const data = {
  name: "autoplay",
  description: "Habilita o autoplay.",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy)
    ? await interaction.reply({ content: "Lúcio está pensando..."})
    : await interaction.deferReply({ ephemeral: true, fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";

  const { player } = (client[interaction.guild.id]?.player) ? client[interaction.guild.id] : { player: null };;

  if (!player) return ((isLegacy) ? reply : interaction)[edit]("Não há fila de músicas.")
  try {
    if (interaction.member.voice.channel.id !== player.voiceId) {
      return ((isLegacy) ? reply : interaction)[edit]({
        content: "Você precisa estar no mesmo canal de voz que eu."
      });
    }
  } catch (e) {
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Você precisa estar conectado a um chat de voz!" });
  }

  player.toggleAutoPlay();

  return ((isLegacy) ? reply : interaction)[edit]({ content: `O autoplay foi ${ (!player.metadata.autoplay) ? "desabilitado!" : "habilitado!"}` });
}
