export type NormalizedPropRow = {
  event_id: string;
  game: string;
  commence_time: string;
  bookmaker: string;
  market: string;
  player: string;
  line: number;
  side: "Over" | "Under";
  odds: number;
};

export function normalizeAltPlayerProps(event: any): NormalizedPropRow[] {
  const rows: NormalizedPropRow[] = [];

  for (const bookmaker of event.bookmakers ?? []) {
    for (const market of bookmaker.markets ?? []) {
      for (const outcome of market.outcomes ?? []) {
        if (!outcome.description) continue;
        if (outcome.point == null) continue;
        if (!outcome.name || !outcome.price) continue;

        rows.push({
          event_id: event.id,
          game: `${event.away_team}@${event.home_team}`,
          commence_time: event.commence_time,
          bookmaker: bookmaker.key,
          market: market.key,
          player: outcome.description,
          line: outcome.point,
          side: outcome.name,
          odds: outcome.price
        });
      }
    }
  }

  return rows;
}
