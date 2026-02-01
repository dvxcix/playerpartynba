import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // How many rows we want (default enough for full slate)
  const limit = Math.min(
    Number(searchParams.get('limit') ?? '50000'),
    100000
  );

  const supabase = supabaseServer();

  /**
   * CRITICAL:
   * Supabase/PostgREST defaults to range(0, 999).
   * If we don't override it, we only get ~1 game.
   */
  const { data, error } = await supabase
    .from('odds_lines_current')
    .select('*')
    .range(0, limit - 1); // ✅ THIS IS THE FIX

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
