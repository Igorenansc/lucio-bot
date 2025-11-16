export const data = {
  name: "skip",
  description: "Pula a música tocando atualmente",
  options: [
    {
      name: "qtd",
      description: "Numero de músicas a serem puladas.",
      required: false,
      min_value: 1,
      type: 4,
    },
  ],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy)
    ? await interaction.reply({ content: "Lúcio está pensando..."})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";

  const { player } = (client[interaction.guild.id]?.player) ? client[interaction.guild.id] : { player: null };;

  if ( !player?.queue?.current || !player?.playing) return ((isLegacy) ? reply : interaction)[edit]("Não há músicas tocando no momento.")

  try {
    if (interaction.member.voice.channel.id !== player.voiceId) {
      return ((isLegacy) ? reply : interaction)[edit]({
        content: "Você precisa estar no mesmo canal de voz que eu."
      });
    }
  } catch (e) {
    console.log(e.message)
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Você precisa estar conectado a um chat de voz!" });
  }

  let amount = (isLegacy)
    ? Number(interaction.content.slice(6).trim())
    : Number(interaction.options.get("qtd")?.value);

  amount = (typeof amount === "number" && amount >= 1 && player.queue.size >= amount) ? amount - 1 : 0;

  const { current } = player.queue;
  if (!current) return ((isLegacy) ? reply : interaction)[edit]("Não há músicas tocando no momento.");

  if (amount) {
    const newQueue = [...player.queue];
    newQueue.splice(0, amount);
    player.queue.clear()
    player.queue.add(newQueue);
    player.skip();
  } else {
    player.skip();
    // queue.node.skip();
  }

  return ((isLegacy) ? reply : interaction)[edit]({
    content: (!amount) ? `A música **${current.title}** foi pulada!`
    : `**${amount + 1}** músicas foram puladas!`
  });
  // return ((isLegacy) ? reply : interaction)[edit]({ content: `A música **${currentTrack.title}** foi pulada!` });
}
