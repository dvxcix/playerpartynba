import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const now = Date.now();
  const lookaheadMs = env.EVENTS_LOOKAHEAD_HOURS * 60 * 60 * 1000;
  const startIso = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const endIso = new Date(now + lookaheadMs).toISOString();

  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('odds_lines_current')
    .select('*')
    .gte('commence_time', startIso)
    .lte('commence_time', endIso)
    .order('game', { ascending: true })
    .order('player', { ascending: true })
    .order('market_key', { ascending: true })
    .order('line', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  const rows = data ?? [];
  const cols = [
    'game',
    'player',
    'market_key',
    'market_name',
    'line',
    'over_price',
    'under_price',
    'bookmaker_title',
    'commence_time',
    'last_update',
    'fetched_at',
    'event_id'
  ];

  const lines: string[] = [];
  lines.push(cols.join(','));
  for (const r of rows as any[]) {
    lines.push(cols.map((c) => csvEscape(r[c])).join(','));
  }

  const body = lines.join('\n');
  const filename = `alt-nba-props-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
  return new NextResponse(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename=\"${filename}\"`,
      'cache-control': 'no-store'
    }
  });
}
