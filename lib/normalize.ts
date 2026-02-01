export function normalizeAltPlayerProps(event: any) {
  const rows: any[] = [];

  for (const bookmaker of event.bookmakers ?? []) {
    for (const market of bookmaker.markets ?? []) {
      for (const outcome of market.outcomes ?? []) {
        if (!outcome.description || outcome.point == null) continue;

        rows.push({
          event_id: event.id,
          game: `${event.away_team}@${event.home_team}`,
          commence_time: event.commence_time,
          bookmaker: bookmaker.key,
          market: market.key,
          player: outcome.description,
          line: outcome.point,
          side: outcome.name, // Over / Under
          odds: outcome.price
        });
      }
    }
  }

  return rows;
}
