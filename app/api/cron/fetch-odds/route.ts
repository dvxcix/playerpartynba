import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const SPORT = 'basketball_nba';
const REGIONS = 'us';
const ODDS_FORMAT = 'american'; // 🔑 FIX

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

const MARKET_LABELS: Record<string, string> = {
  player_points_alternate: 'Alt Points',
  player_rebounds_alternate: 'Alt Rebounds',
  player_assists_alternate: 'Alt Assists',
  player_blocks_alternate: 'Alt Blocks',
  player_steals_alternate: 'Alt Steals',
  player_turnovers_alternate: 'Alt Turnovers',
  player_threes_alternate: 'Alt Threes',
  player_points_assists_alternate: 'Alt Points + Assists',
  player_points_rebounds_alternate: 'Alt Points + Rebounds',
  player_rebounds_assists_alternate: 'Alt Rebounds + Assists',
  player_points_rebounds_assists_alternate: 'Alt PRA',
};

const TEAM_ABBR: Record<string, string> = {
  'Atlanta Hawks': 'ATL',
  'Boston Celtics': 'BOS',
  'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA',
  'Chicago Bulls': 'CHI',
  'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL',
  'Denver Nuggets': 'DEN',
  'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW',
  'Houston Rockets': 'HOU',
  'Indiana Pacers': 'IND',
  'LA Clippers': 'LAC',
  'Los Angeles Lakers': 'LAL',
  'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA',
  'Milwaukee Bucks': 'MIL',
  'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP',
  'New York Knicks': 'NYK',
  'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL',
  'Philadelphia 76ers': 'PHI',
  'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR',
  'Sacramento Kings': 'SAC',
  'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR',
  'Utah Jazz': 'UTA',
  'Washington Wizards': 'WAS',
};

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OddsAPI ${res.status}: ${text}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = supabaseServer();
  const apiKey = process.env.ODDS_API_KEY!;
  const fetchedAt = new Date().toISOString();

  // 1️⃣ Fetch events
  const events = await fetchJson(
    `${ODDS_API_BASE}/sports/${SPORT}/events?apiKey=${apiKey}`
  );

  const rows: any[] = [];

  // 2️⃣ Fetch odds per event
  for (const event of events) {
    const odds = await fetchJson(
      `${ODDS_API_BASE}/sports/${SPORT}/events/${event.id}/odds` +
        `?apiKey=${apiKey}` +
        `&regions=${REGIONS}` +
        `&markets=${MARKETS}` +
        `&oddsFormat=${ODDS_FORMAT}` // 🔑 FIX
    );

    const game = `${TEAM_ABBR[event.away_team] ?? event.away_team}@${TEAM_ABBR[event.home_team] ?? event.home_team}`;

    for (const bookmaker of odds.bookmakers ?? []) {
      for (const market of bookmaker.markets ?? []) {
        const grouped: Record<string, any> = {};

        for (const o of market.outcomes ?? []) {
          if (o.price == null || o.point == null) continue;

          const key = `${o.description}|${o.point}`;
          grouped[key] ||= {
            player: o.description,
            line: o.point,
            over_price: null,
            under_price: null,
          };

          if (o.name === 'Over') grouped[key].over_price = o.price;
          if (o.name === 'Under') grouped[key].under_price = o.price;
        }

        for (const g of Object.values(grouped)) {
          rows.push({
            event_id: event.id,
            commence_time: event.commence_time,
            game,
            bookmaker_key: bookmaker.key,
            bookmaker_title: bookmaker.title,
            market_key: market.key,
            market_name: MARKET_LABELS[market.key] ?? market.key,
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

  // 3️⃣ Insert / update
  const { error } = await supabase
    .from('odds_lines_current')
    .upsert(rows, {
      onConflict: 'event_id,bookmaker_key,market_key,player,line',
    });

  if (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: rows.length });
}

// GET for browser testing
export async function GET() {
  return POST(
    new Request('http://localhost', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
  );
}
