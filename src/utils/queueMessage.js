export default function (player, initialIndex = 0) {
  const queueLength = player.queue.size;
  let initialTrackIndex = (queueLength >= initialIndex) ? initialIndex : Math.floor(queueLength / 10) * 10;
  let finalTrackIndex = initialTrackIndex + 10;

  const tracks = [...player.queue];
  const queueStr = (!tracks.length) ? ":cricket:‎ ‎ ‎:cricket::cricket:‎ ‎:cricket:"
                                    : tracks.slice(initialTrackIndex, finalTrackIndex).map((music, i) => {
                                        return `**${initialTrackIndex + (i + 1)} - ** ${music.title} - ${(music.isStream) ? "AO VIVO" : `${parseDuration(music.length)}`}`;
                                      }).join("\n");

  const repeatMode = {
    0: ":play_pause: OFF",
    1: ":repeat_one: TRACK",
    2: ":repeat: QUEUE",
    3: ":infinity: AUTOPLAY",
  }

  const pageOptions = [{ label: "1", value: "0" }];

  // const lowerRange = (finalTrackIndex / 10) - 12;
  // const upperRange = (queueLength / 10) - ((finalTrackIndex / 10) + 12);

  const lowerRange = Math.ceil((finalTrackIndex / 10) - 12);
  const upperRange = Math.ceil((queueLength / 10) - ((finalTrackIndex / 10) + 12));

  const initOptIndex = Math.max(
    1,
    (Math.sign(upperRange) === -1) ? (lowerRange - Math.abs(upperRange)) : lowerRange
  );

  const fnOptIndex = Math.min(
    queueLength / 10,
    (Math.sign(lowerRange) === -1) ? (((finalTrackIndex / 10) + 12) + Math.abs(lowerRange)) : ((finalTrackIndex / 10) + 12),
  )

  for(let i = initOptIndex; i < fnOptIndex; i++) {
    pageOptions.push({ label: `${i + 1}`, value: `${i * 10}` })
  }

  // console.log([initialIndex, initialTrackIndex, finalTrackIndex, lowerRange, upperRange])

  // that crazyness of characters on the labels are to make the buttons larger using invisible characters/spaces
  const previousPageButton = {
    type: 2,
    custom_id: "queue_message_previous",
    label: "‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎<‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎",
    style: 1,
    disabled: (initialTrackIndex === 0),
  };
  const refreshButton = {
    type: 2,
    custom_id: "queue_message_refresh",
    label: "↻",
    style: 2,
  };
  const actualPageDisplayButton = {
    type: 2,
    custom_id: "queue_message_page_disabled",
    label: `${finalTrackIndex / 10} / ${Math.ceil(queueLength / 10) || 1}`,
    style: 2,
  };
  const removeButton = {
    type: 2,
    custom_id: "queue_message_remove",
    label: "✖",
    style: 2,
  }
  const selectPageMenu = {
    type: 3,
    custom_id: "queue_message_page",
    placeholder: `${finalTrackIndex / 10}`,
    style: 2,
    options: pageOptions,
  };
  const nextPageButton = {
    type: 2,
    custom_id: "queue_message_next",
    label: "‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎>‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎",
    style: 1,
    disabled: (finalTrackIndex >= queueLength),
  };

  const embed = {
    color: 3066993,
    fields: [
      {
        name: ":musical_note: Tocando Agora",
        value: `${player.queue.current.title}`,
        inline: true,
      },
      {
        name: ":loud_sound: Auto Play",
        value: `${(player.metadata.autoplay) ? ":white_check_mark:" : ":negative_squared_cross_mark:"}`,
        inline: true,
      },
      {
        name: "",
        value: generateProgressBar(player),
        inline: false,
      },
      {
        name: ":notes: Queue",
        value: queueStr,
        inline: false,
      }
    ],
  }

  const actionRow = {
    type: 1,
    components: [previousPageButton, refreshButton, actualPageDisplayButton, removeButton, nextPageButton]
  };

  const actionRow2 = {
    type: 1,
    components: [selectPageMenu]
  }

  return { embeds: [embed], components: [actionRow, actionRow2] };
}

export const generateProgressBar = (player) => {
  const currentTime = ((!player.paused) ? Date.now() : player.metadata.trackStart.pausedTime) - player.metadata.trackStart.time;
  const totalTime = player.queue.current.length;

  const barLength = 18;
  const barPosition = Math.floor((currentTime / totalTime) * barLength);
  const barString = "▬".repeat(barPosition) + "🔘" + "▬".repeat(barLength - barPosition);

  const progressBar = (player.queue.current.isStream) ? ":red_circle: **AO VIVO**"
                    : `${parseDuration(currentTime)} | ${barString} | ${parseDuration(totalTime)}`;

  return progressBar;
};

export const parseDuration = (duration, isSeconds = false) => {
  duration = (isSeconds) ? duration : Math.floor(duration / 1000);

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration - (hours * 3600)) / 60);
  const seconds = Math.floor(duration - (hours * 3600) - (minutes * 60));

  const hoursStr = (hours < 10) ? `0${hours}` : hours;
  const minutesStr = (minutes < 10) ? `0${minutes}` : minutes;
  const secondsStr = (seconds < 10) ? `0${seconds}` : seconds;

  return (hours > 0) ? `${hoursStr}:${minutesStr}:${secondsStr}` : `${minutesStr}:${secondsStr}`;
};
