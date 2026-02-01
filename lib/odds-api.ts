const BASE = "https://api.the-odds-api.com/v4";

export async function fetchNBAEvents(apiKey: string) {
  const res = await fetch(
    `${BASE}/sports/basketball_nba/events?apiKey=${apiKey}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch NBA events");
  }

  const events = await res.json();

  const now = new Date();

  // INCLUDE:
  // - games later today
  // - games that already started today
  return events.filter((event: any) => {
    const commence = new Date(event.commence_time);

    return (
      commence.getUTCDate() === now.getUTCDate() &&
      commence.getUTCMonth() === now.getUTCMonth() &&
      commence.getUTCFullYear() === now.getUTCFullYear()
    );
  });
}
