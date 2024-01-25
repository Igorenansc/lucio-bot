export const data = {
  name: "status",
  description: "Muda o status do bot!",
  options: [
    {
    name: "tipo",
    description: "Tipo de status que você quer colocar!",
    required: true,
    type: 3,
    choices: [
      {
        name: "Jogando",
        value: "Playing"
      },
      {
        name: "Transmitindo",
        value: "Streaming"
      },
      {
        name: "Ouvindo",
        value: "Listening"
      },
      {
        name: "Assistindo",
        value: "Watching"
      },
      {
        name: "Personalizado",
        value: "Custom"
      },
      {
        name: "Competindo",
        value: "Competing"
      },
      {
        name: "Limpar",
        value: "Clear"
      }
    ]
    },
    {
      name: "mensagem",
      description: "Mensagem/Título do status!",
      required: true,
      type: 3,
    },
    {
      name: "url",
      description: "URL do status (transmissão).",
      required: false,
      type: 3,
    }
  ],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  let reply;

  if (isLegacy) {
    reply = await interaction.reply({ content: "Lúcio está pensando..."});
  } else {
    await interaction.deferReply({ ephemeral: true, fetchReply: true });
    reply = interaction;
  }

  const edit = (isLegacy) ? "edit" : "editReply";

  try {
    if (!client.owners.includes(interaction.member.id)) {
      return await reply[edit]({ content: `Você não tem permissão para usar esse comando.` });
    }

    const rawType = interaction.options.get("tipo").value;
    const message = interaction.options.getString("mensagem", true);

    const statusType = {
      "Playing": 0,
      "Streaming": 1,
      "Listening": 2,
      "Watching": 3,
      "Custom": 4,
      "Competing": 5,
      "Clear": 6
    }

    const type = statusType[rawType];

    if (type < 4 && type > 0) {
      client.user.setActivity({
        name: message,
        type,
        url: interaction.options.getString("url", true),
      });
      return await reply[edit]({ content: `${rawType}: ${message}` });
    }

    if (type === 6) {
      client.user.setActivity();
      return await reply[edit]({ content: 'Status apagado!' });
    };

    client.user.setActivity({
      name: message,
      type,
    });

    return await reply[edit]({ content: `Status alterado para: ${message}` });
  } catch (e) {
    console.log(`Commando: '/status'\nErro: ${e.message}`);
    return await reply[edit]({ content: "Ocorreu um erro ao executar o commando" });
  }
}
