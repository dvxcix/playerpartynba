import { fetchNBAEvents, fetchEventOdds } from "@/lib/odds-api";
import { normalizeAltPlayerProps } from "@/lib/normalize";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const events = await fetchNBAEvents(process.env.ODDS_API_KEY!);

  // Store ALL events (do not filter by time here)
  await supabase.from("nba_events").upsert(
    events.map((e: any) => ({
      event_id: e.id,
      game: `${e.away_team}@${e.home_team}`,
      commence_time: e.commence_time
    }))
  );

  let totalRows = 0;

  for (const event of events) {
    const res = await fetchEventOdds(process.env.ODDS_API_KEY!, event.id);
    if (!res) continue;

    const normalized = normalizeAltPlayerProps(res.json);
    if (!normalized.length) continue;

    const paired = new Map<string, any>();

    for (const row of normalized) {
      const key = [
        row.event_id,
        row.bookmaker,
        row.market,
        row.player,
        row.line
      ].join("|");

      const existing = paired.get(key) ?? {
        event_id: row.event_id,
        game: row.game,
        commence_time: row.commence_time,
        bookmaker: row.bookmaker,
        market: row.market,
        player: row.player,
        line: row.line,
        over: null,
        under: null
      };

      if (row.side === "Over") existing.over = row.odds;
      if (row.side === "Under") existing.under = row.odds;

      paired.set(key, existing);
    }

    const finalRows = [...paired.values()].filter(
      r => r.over !== null && r.under !== null
    );

    if (finalRows.length) {
      await supabase.from("odds_lines_current").upsert(finalRows);
      totalRows += finalRows.length;
    }
  }

  return Response.json({
    ok: true,
    events: events.length,
    rows: totalRows
  });
}
