import { Client } from "youtubei";
import { run as playMusic } from "./play.js"

export const data = {
  name: "yt",
  description: "Faz uma busca específica no youtube.",
  options: [
    {
      name: "tipo",
      description: "Tipo de busca.",
      type: 3,
      required: true,
      choices: [
        {
          name: "musica",
          value: "video"
        },
        {
          name: "playlist",
          value: "playlist"
        }
      ]
    },
    {
      name: "busca",
      description: "Digite o nome da música/playlist.",
      required: true,
      autocomplete: true,
      type: 3,
    },
  ],
};

export const autocomplete = async (interaction) => {
  const focusedValue = interaction.options.getFocused();
  const type = interaction.options.get("tipo").value;
  const client = new Client;

  const searchType = {
    video: "watch?v=",
    playlist: "playlist?list="
  }
  
  const choices = (await client.search(focusedValue, { type })).items;
  
  const emoji = (type === "video") ? "🎵" : "🎶";
  const url = `https://www.youtube.com/${searchType[type]}`;
  
  await interaction.respond(choices.map(({ title, id }) => ({ name: `${emoji} ${title}`.slice(0, 99), value: `${url}${id}` })));
};

export const run = playMusic;