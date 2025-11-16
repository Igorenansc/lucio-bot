import { Innertube } from "youtubei.js";
import { Client } from "youtubei";
import { run as playMusic } from "./play.js"
import { parseDuration } from '../../utils/queueMessage.js';

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
  let client

  if (type === "video") {
    client = new Client;
  } else {
    client = await Innertube.create();
  }

  const searchType = {
    video: "watch?v=",
    playlist: "playlist?list="
  }

  let results = (await client.search(focusedValue, { type }))[(type === "video") ? "items" : "results"];

  results = results.filter((opt) => {
    if (type === "video") {
      if (opt.title && opt.id) return true
    } else {
      if (opt.metadata?.title?.text && opt.content_id) return true
    }
    return false
  })

  const emoji = (type === "video") ? "🎵" : "🎶";
  const url = `https://www.youtube.com/${searchType[type]}`;
  console.log(results[0])


  results
  await interaction.respond(results.map((opt) => {
    const prefix = (type === "video") ? `${emoji} [${parseDuration(opt.duration, true)}] -` : `${emoji}`;
    return ({ name: `${prefix} ${(type === "video") ? opt.title : opt.metadata.title.text}`.slice(0, 99), value: `${url}${(type === "video") ? opt.id : opt.content_id}` })
  }));
};

export const run = playMusic;
