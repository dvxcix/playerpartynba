import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = supabaseServer();

  /**
   * =========================================================
   * 🔽 INSERT YOUR EXISTING FETCH + NORMALIZE LOGIC HERE 🔽
   *
   * This should produce an array like:
   * [
   *   {
   *     event_id,
   *     game,
   *     bookmaker_key,
   *     bookmaker_title,
   *     market_key,
   *     market_name,
   *     player,
   *     line,
   *     over_price,
   *     under_price,
   *     commence_time,
   *     last_update,
   *     fetched_at
   *   },
   *   ...
   * ]
   *
   * IMPORTANT:
   * - Do NOT include first_over_price / first_under_price yet
   * - That is handled below
   * =========================================================
   */

  const rows: any[] = []; // ← replace this with your real normalized rows

  /**
   * =========================================================
   * 🧠 PRESERVE ORIGINAL ODDS (FIRST SEEN)
   * =========================================================
   *
   * Logic:
   * - If row already exists → keep first_* as-is
   * - If row is new → set first_* = current odds
   */

  const upserts = rows.map((r) => ({
    ...r,
    first_over_price:
      r.first_over_price !== undefined && r.first_over_price !== null
        ? r.first_over_price
        : r.over_price,
    first_under_price:
      r.first_under_price !== undefined && r.first_under_price !== null
        ? r.first_under_price
        : r.under_price,
  }));

  const { error } = await supabase
    .from('odds_lines_current')
    .upsert(upserts, {
      onConflict: 'event_id,bookmaker_key,market_key,player,line',
    });

  if (error) {
    console.error('UPSERT ERROR:', error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  console.log(
    `[CRON] fetch-odds ran at ${new Date().toISOString()} | rows=${upserts.length}`
  );

  return NextResponse.json({
    ok: true,
    rows: upserts.length,
  });
}
