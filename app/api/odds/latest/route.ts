import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = supabaseServer();

  /**
   * IMPORTANT:
   * We intentionally DO NOT use LIMIT.
   * Each game has thousands of rows.
   * Any LIMIT will truncate to a single game.
   *
   * The frontend handles filtering/toggling.
   */
  const { data, error } = await supabase
    .from('odds_lines_current')
    .select('*');

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
