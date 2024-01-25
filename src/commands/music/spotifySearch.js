import search from "../../utils/spotifyHelper.js";
import { run as playMusic } from "./play.js"
import { parseDuration } from '../../utils/queueMessage.js';

export const data = {
  name: "sp",
  description: "Faz uma busca específica no spotify.",
  options: [
    {
      name: "tipo",
      description: "Tipo de busca.",
      type: 3,
      required: true,
      choices: [
        {
          name: "musica",
          value: "track"
        },
        {
          name: "playlist",
          value: "playlist"
        },
        {
          name: "album",
          value: "album"
        }
      ]
    },
    {
      name: "busca",
      description: "Valor da busca.",
      required: true,
      autocomplete: true,
      type: 3,
    },
  ],
};

export const autocomplete = async (interaction) => {
  const focusedValue = interaction.options.getFocused();
  const type = interaction.options.get("tipo").value;

  const choices = await search(focusedValue, type);

  const emoji = (type === "track") ? "🎵" : "🎶";

  await interaction.respond(choices.map((opt) => {
    const prefix = (type === "track")
      ? `${emoji}[${parseDuration(Math.floor(opt.extra / 1000))}] -`
      : `${emoji}`;
    return ({ name: `${prefix} ${opt.title}`.slice(0, 99), value: opt.url });
  }));
};

export const run = playMusic;
