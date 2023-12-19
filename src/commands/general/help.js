
export const data = {
  name: "help",
  description: "Mostra os comandos disponíveis",
  options: [],
};
export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy)
    ? await interaction.reply({ content: "Lúcio está pensando...", ephemeral: true })
    : await interaction.deferReply({ ephemeral: true, fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";

  const embedResponse = {
    title: "Comandos disponíveis",
    description: "Aqui estão todos os comandos disponíveis para você usar!",
    fields: [
      {
        name: "/p",
        value: "Toca uma música no canal de voz atual, recebe como parâmetro o nome ou link da música."
      },
      {
        name: "/q",
        value: "Mostra a fila de músicas."
      },
      {
        name: "/autoplay",
        value: "Habilita/desabilita o modo autoplay, já vem ativado por padrão."
      },
      {
        name: "/skip",
        value: "Pula a música tocando atualmente."
      },
      {
        name: "/stop",
        value: "Para a execução da fila de músicas e remove o bot."
      },
      {
        name: "/pause",
        value: "Pausa/retoma a música tocando atualmente."
      },
      {
        name: "/shuffle",
        value: "Embaralha as músicas da fila."
      }
    ]
  }

  return ((isLegacy) ? reply : interaction)[edit]({ embeds: [embedResponse] });
}
