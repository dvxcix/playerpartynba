import { ALT_PLAYER_MARKETS } from "./markets";

const BASE = "https://api.the-odds-api.com/v4";

export async function fetchNBAEvents(apiKey: string) {
  const res = await fetch(
    `${BASE}/sports/basketball_nba/events?apiKey=${apiKey}`
  );
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function fetchEventOdds(
  apiKey: string,
  eventId: string
) {
  const markets = ALT_PLAYER_MARKETS.join(",");
  const url = `${BASE}/sports/basketball_nba/events/${eventId}/odds?apiKey=${apiKey}&markets=${markets}&regions=us`;

  const res = await fetch(url);
  if (!res.ok) return null;

  return {
    json: await res.json(),
    headers: {
      remaining: res.headers.get("x-requests-remaining"),
      used: res.headers.get("x-requests-used")
    }
  };
}
