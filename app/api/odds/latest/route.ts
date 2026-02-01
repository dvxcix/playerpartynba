import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '50000'), 100000);

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
    .order('line', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] }, {
    headers: {
      'cache-control': 'no-store'
    }
  });
}
