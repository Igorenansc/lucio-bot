import fetch from "isomorphic-unfetch";

const requestAnonymousToken = async () => {
  const ANON_TOKEN_URL = "https://open.spotify.com/get_access_token?reason=transport&productType=embed";
  const res = await fetch(ANON_TOKEN_URL, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  const body = await res.json();

  const data = {
    token: body.accessToken,
    expiresAfter: body.accessTokenExpirationTimestampMs,
    type: "Bearer",
  };

  return data;
}

const search = async (query, type = "track") => {
  try {
    const token = await requestAnonymousToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search/?q=${encodeURIComponent(query)}&type=${type}&market=US`,
      { 
        headers: {
          Authorization: `${token.type} ${token.token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await res.json();

    const responseTypes = {
      track: "tracks",
      album: "albums",
      playlist: "playlists"
    }
    
    return data[responseTypes[type]].items.map((item) => ({
      title: (type !== "playlist") ? item.name + " - " + item.artists.map((a) => a.name).join(", ") : item.name,
      url: item.external_urls?.spotify || `https://open.spotify.com/${type}/${m.id}`,
    }));
  } catch (e) {
    return [];
  }
}

export default search;
