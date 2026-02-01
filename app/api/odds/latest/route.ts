import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Number(searchParams.get('limit') ?? '50000'),
    100000
  );

  const supabase = supabaseServer();

  /**
   * IMPORTANT:
   * Order by commence_time FIRST so rows are mixed across games.
   * Ordering by `game` first + LIMIT will truncate to a single game.
   */
  const { data, error } = await supabase
    .from('odds_lines_current')
    .select('*')
    .order('commence_time', { ascending: true })
    .order('game', { ascending: true })
    .order('player', { ascending: true })
    .order('market_key', { ascending: true })
    .order('line', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { ok: false, error },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, rows: data ?? [] },
    {
      headers: {
        'cache-control': 'no-store',
      },
    }
  );
}
