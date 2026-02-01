import { env } from '@/lib/env';
import { ALT_NBA_PLAYER_PROP_MARKETS, ALT_MARKET_LABELS, type AltMarketKey } from '@/lib/markets';
import { gameLabel } from '@/lib/teamAbbr';

const BASE = 'https://api.the-odds-api.com/v4';

type Event = {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string;
  home_team: string;
  away_team: string;
};

type OddsOutcome = {
  name: string;
  description?: string;
  price: number;
  point?: number;
};

type OddsMarket = {
  key: string;
  last_update?: string;
  outcomes: OddsOutcome[];
};

type Bookmaker = {
  key: string;
  title: string;
  last_update?: string;
  markets: OddsMarket[];
};

type EventOdds = {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
};

export type OddsRow = {
  event_id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  game: string;
  bookmaker_key: string;
  bookmaker_title: string;
  market_key: string;
  market_name: string | null;
  player: string;
  line: number;
  over_price: number | null;
  under_price: number | null;
  last_update: string | null;
  fetched_at: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithRetry(url: string, init?: RequestInit, tries = 4) {
  let lastErr: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      const remaining = res.headers.get('x-requests-remaining');
      const used = res.headers.get('x-requests-used');
      const last = res.headers.get('x-requests-last');

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const msg = `HTTP ${res.status} ${res.statusText} — ${text.slice(0, 250)}`;

        // Backoff on rate limits / transient issues.
        if (res.status === 429 || res.status >= 500) {
          const wait = 500 * Math.pow(2, i) + Math.floor(Math.random() * 250);
          console.warn(`[TheOddsAPI] ${msg}. Retrying in ${wait}ms`, { remaining, used, last });
          await sleep(wait);
          continue;
        }
        throw new Error(`[TheOddsAPI] ${msg}`);
      }

      const json = await res.json();
      return { json, headers: { remaining, used, last } };
    } catch (e) {
      lastErr = e;
      const wait = 500 * Math.pow(2, i) + Math.floor(Math.random() * 250);
      console.warn(`[TheOddsAPI] Fetch failed, retrying in ${wait}ms`, e);
      await sleep(wait);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to fetch after retries');
}

export async function fetchNbaEvents(): Promise<Event[]> {
  const url = new URL(`${BASE}/sports/basketball_nba/events`);
  url.searchParams.set('apiKey', env.ODDS_API_KEY);

  const { json } = await fetchJsonWithRetry(url.toString());
  return json as Event[];
}

export async function fetchAltPlayerPropsForEvent(eventId: string): Promise<{ rows: OddsRow[]; headers?: Record<string, string | null> }>
{
  const url = new URL(`${BASE}/sports/basketball_nba/events/${eventId}/odds`);
  url.searchParams.set('apiKey', env.ODDS_API_KEY);
  url.searchParams.set('regions', env.ODDS_API_REGIONS);
  url.searchParams.set('markets', ALT_NBA_PLAYER_PROP_MARKETS.join(','));
  url.searchParams.set('oddsFormat', 'american');
  url.searchParams.set('dateFormat', 'iso');
  if (env.ODDS_API_BOOKMAKERS.trim()) url.searchParams.set('bookmakers', env.ODDS_API_BOOKMAKERS.trim());

  const fetchedAt = new Date().toISOString();
  const { json, headers } = await fetchJsonWithRetry(url.toString());
  const data = json as EventOdds;

  const out: OddsRow[] = [];
  const game = gameLabel(data.away_team, data.home_team);

  for (const book of data.bookmakers ?? []) {
    for (const market of book.markets ?? []) {
      const marketKey = market.key;

      // Only keep our alternate markets (some books may return extras).
      if (!(ALT_NBA_PLAYER_PROP_MARKETS as readonly string[]).includes(marketKey)) continue;

      const label = ALT_MARKET_LABELS[marketKey as AltMarketKey] ?? null;
      const groups = new Map<string, OddsRow>();

      for (const o of market.outcomes ?? []) {
        const player = (o.description ?? '').trim();
        const line = o.point;
        if (!player || line === null || line === undefined) continue;

        const id = `${player}||${line}`;
        const existing = groups.get(id);

        const baseRow: OddsRow = existing ?? {
          event_id: data.id,
          sport_key: data.sport_key,
          commence_time: data.commence_time,
          home_team: data.home_team,
          away_team: data.away_team,
          game,
          bookmaker_key: book.key,
          bookmaker_title: book.title,
          market_key: marketKey,
          market_name: label,
          player,
          line,
          over_price: null,
          under_price: null,
          last_update: market.last_update ?? book.last_update ?? null,
          fetched_at: fetchedAt,
        };

        const side = o.name.toLowerCase();
        if (side.startsWith('over')) baseRow.over_price = o.price;
        else if (side.startsWith('under')) baseRow.under_price = o.price;

        groups.set(id, baseRow);
      }

      out.push(...Array.from(groups.values()));
    }
  }

  return { rows: out, headers };
}
