import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const SPORT = 'basketball_nba';
const REGIONS = 'us';

const MARKETS = [
  'player_points_alternate',
  'player_rebounds_alternate',
  'player_assists_alternate',
  'player_blocks_alternate',
  'player_steals_alternate',
  'player_turnovers_alternate',
  'player_threes_alternate',
  'player_points_assists_alternate',
  'player_points_rebounds_alternate',
  'player_rebounds_assists_alternate',
  'player_points_rebounds_assists_alternate',
].join(',');

type NormalizedRow = {
  event_id: string;
  commence_time: string;
  game: string;
  bookmaker_key: string;
  bookmaker_title: string;
  market_key: string;
  market_name: string;
  player: string;
  line: number;
  over_price: number | null;
  under_price: number | null;
  first_over_price?: number | null;
  first_under_price?: number | null;
  last_update: string;
  fetched_at: string;
};

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OddsAPI ${res.status}: ${text}`);
  }
  return res.json();
}

async function runFetch() {
  const supabase = supabaseServer();
  const apiKey = process.env.ODDS_API_KEY!;
  const fetchedAt = new Date().toISOString();

  console.log('[CRON] Fetching NBA events');

  // 1️⃣ Fetch events
  const events = await fetchJson(
    `${ODDS_API_BASE}/sports/${SPORT}/events?apiKey=${apiKey}`
  );

  const rows: NormalizedRow[] = [];

  // 2️⃣ Fetch odds per event
  for (const event of events) {
    const oddsUrl =
      `${ODDS_API_BASE}/sports/${SPORT}/events/${event.id}/odds` +
      `?apiKey=${apiKey}&regions=${REGIONS}&markets=${MARKETS}`;

    const odds = await fetchJson(oddsUrl);

    for (const bookmaker of odds.bookmakers ?? []) {
      for (const market of bookmaker.markets ?? []) {

        // 🔑 Correct grouping: player + LINE (o.point)
        const grouped: Record<
          string,
          {
            player: string;
            line: number;
            over_price: number | null;
            under_price: number | null;
          }
        > = {};

        for (const o of market.outcomes ?? []) {
          if (o.point == null || o.price == null) continue;

          const key = `${o.description}|${o.point}`;

          if (!grouped[key]) {
            grouped[key] = {
              player: o.description,
              line: o.point,            // ✅ LINE
              over_price: null,
              under_price: null,
            };
          }

          if (o.name === 'Over') {
            grouped[key].over_price = o.price;   // ✅ ODDS
          } else if (o.name === 'Under') {
            grouped[key].under_price = o.price;  // ✅ ODDS
          }
        }

        for (const g of Object.values(grouped)) {
          rows.push({
            event_id: event.id,
            commence_time: event.commence_time,
            game: `${event.away_team.split(' ')[0].toUpperCase()}@${event.home_team.split(' ')[0].toUpperCase()}`,
            bookmaker_key: bookmaker.key,
            bookmaker_title: bookmaker.title,
            market_key: market.key,
            market_name: market.key.replace(/_/g, ' '),
            player: g.player,
            line: g.line,
            over_price: g.over_price,
            under_price: g.under_price,
            last_update: bookmaker.last_update,
            fetched_at: fetchedAt,
          });
        }
      }
    }
  }

  console.log('[CRON] Normalized rows:', rows.length);

  // 3️⃣ Upsert while PRESERVING original odds
  for (const r of rows) {
    const { data: existing } = await supabase
      .from('odds_lines_current')
      .select('first_over_price, first_under_price')
      .eq('event_id', r.event_id)
      .eq('bookmaker_key', r.bookmaker_key)
      .eq('market_key', r.market_key)
      .eq('player', r.player)
      .eq('line', r.line)
      .maybeSingle();

    const upsertRow = {
      ...r,
      first_over_price:
        existing?.first_over_price ?? r.over_price,
      first_under_price:
        existing?.first_under_price ?? r.under_price,
    };

    await supabase
      .from('odds_lines_current')
      .upsert(upsertRow, {
        onConflict: 'event_id,bookmaker_key,market_key,player,line',
      });
  }

  return rows.length;
}

/**
 * POST → Vercel cron (auth required)
 * GET  → manual test (no auth)
 */
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const count = await runFetch();
    console.log(`[CRON] Completed, rows=${count}`);
    return NextResponse.json({ ok: true, rows: count });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err.message ?? err },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const count = await runFetch();
    return NextResponse.json({ ok: true, rows: count });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message ?? err },
      { status: 500 }
    );
  }
}
