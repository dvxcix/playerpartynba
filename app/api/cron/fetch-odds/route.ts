import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { supabaseServer } from '@/lib/supabaseServer';
import { fetchNbaEvents, fetchAltPlayerPropsForEvent } from '@/lib/oddsApi';

export const runtime = 'nodejs';
export const maxDuration = 60; // seconds (Vercel plan dependent)

function isAuthed(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : auth;
  const alt = req.headers.get('x-cron-secret') ?? '';
  return token === env.CRON_SECRET || alt === env.CRON_SECRET;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  if (!isAuthed(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const supabase = supabaseServer();

  const now = Date.now();
  const lookaheadMs = env.EVENTS_LOOKAHEAD_HOURS * 60 * 60 * 1000;
  const horizon = now + lookaheadMs;

  const events = await fetchNbaEvents();
  const upcoming = events
    .filter((e) => {
      const t = new Date(e.commence_time).getTime();
      return !Number.isNaN(t) && t >= now - 2 * 60 * 60 * 1000 && t <= horizon; // include just-started
    })
    .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
    .slice(0, env.MAX_EVENTS_PER_RUN);

  const allRows: any[] = [];
  const perEvent: Array<{ event_id: string; rows: number; remaining?: string | null; used?: string | null; last?: string | null }> = [];

  for (const e of upcoming) {
    const { rows, headers } = await fetchAltPlayerPropsForEvent(e.id);
    allRows.push(
      ...rows.map((r) => ({
        event_id: r.event_id,
        sport_key: r.sport_key,
        commence_time: r.commence_time,
        home_team: r.home_team,
        away_team: r.away_team,
        game: r.game,
        bookmaker_key: r.bookmaker_key,
        bookmaker_title: r.bookmaker_title,
        market_key: r.market_key,
        market_name: r.market_name,
        player: r.player,
        line: r.line,
        over_price: r.over_price,
        under_price: r.under_price,
        last_update: r.last_update,
        fetched_at: r.fetched_at,
      }))
    );

    perEvent.push({ event_id: e.id, rows: rows.length, ...(headers ?? {}) });
  }

  // Upsert into odds_lines_current
  let upserted = 0;
  if (allRows.length) {
    const batches = chunk(allRows, 500);
    for (const b of batches) {
      const { error } = await supabase
        .from('odds_lines_current')
        .upsert(b, { onConflict: 'event_id,bookmaker_key,market_key,player,line' });
      if (error) {
        return NextResponse.json({ ok: false, stage: 'upsert', error }, { status: 500 });
      }
      upserted += b.length;
    }
  }

  const ms = Date.now() - started;
  return NextResponse.json({ ok: true, events: upcoming.length, rows: upserted, took_ms: ms, perEvent });
}
