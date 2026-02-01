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

  let totalRows = 0;

  for (const event of events) {
    const res = await fetchEventOdds(process.env.ODDS_API_KEY!, event.id);
    if (!res) continue;

    const normalized = normalizeAltPlayerProps(res.json);
    if (!normalized.length) continue;

    // Pair Over / Under
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
        ...row,
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

  return Response.json({ ok: true, rows: totalRows });
}
