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
  home_team: string;
  away_team: string;
  game: string;
  bookmaker_key: string;
  bookmaker_title: string;
  market_key: string;
  market_name: string;
  player: string;
  line: number;
  over_price: number | null;
  under_price: number | null;
  last_update: string;
  fetched_at: string;
};

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OddsAPI error ${res.status}: ${text}`);
  }
  return res.json();
}

async function runFetch() {
  const supabase = supabaseServer();
  const apiKey = process.env.ODDS_API_KEY!;
  const nowIso = new Date().toISOString();

  console.log('[CRON] Fetching NBA events');

  // 1️⃣ Fetch events
  const events = await fetchJson(
    `${ODDS_API_BASE}/sports/${SPORT}/events?apiKey=${apiKey}`
  );

  let rows: NormalizedRow[] = [];

  // 2️⃣ Fetch odds per event
  for (const event of events) {
    const oddsUrl =
      `${ODDS_API_BASE}/sports/${SPORT}/events/${event.id}/odds` +
      `?apiKey=${apiKey}&regions=${REGIONS}&markets=${MARKETS}`;

    const odds = await fetchJson(oddsUrl);

    for (const bookmaker of odds.bookmakers ?? []) {
      for (const market of bookmaker.markets ?? []) {
        const outcomes = market.outcomes ?? [];

        // Pair Over/Under by (player + line)
        const grouped: Record<string, any> = {};

        for (const o of outcomes) {
          const key = `${o.description}|${o.point}`;
          grouped[key] ||= {
            over_price: null,
            under_price: null,
            player: o.description,
            line: o.point,
          };

          if (o.name === 'Over') grouped[key].over_price = o.price;
          if (o.name === 'Under') grouped[key].under_price = o.price;
        }

        for (const g of Object.values(grouped)) {
          rows.push({
            event_id: event.id,
            commence_time: event.commence_time,
            home_team: event.home_team,
            away_team: event.away_team,
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
            fetched_at: nowIso,
          });
        }
      }
    }
  }

  console.log(`[CRON] Normalized rows: ${rows.length}`);

  // 3️⃣ Preserve first odds
  const upserts = rows.map((r) => ({
    ...r,
    first_over_price: r.over_price,
    first_under_price: r.under_price,
  }));

  const { error } = await supabase
    .from('odds_lines_current')
    .upsert(upserts, {
      onConflict: 'event_id,bookmaker_key,market_key,player,line',
    });

  if (error) {
    console.error(error);
    throw error;
  }

  return upserts.length;
}

/**
 * POST = cron (auth required)
 * GET = manual test (no auth, dev-friendly)
 */
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

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
