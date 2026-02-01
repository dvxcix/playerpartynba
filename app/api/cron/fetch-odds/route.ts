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

  // 👇 This should already exist in your code:
  // rows = normalized odds pulled from TheOddsAPI
  const rows: any[] = await getNormalizedOddsSomehow(); // ← your existing logic

  const upserts = rows.map((r) => ({
    ...r,
    // Preserve original odds only on first insert
    first_over_price: r.first_over_price ?? r.over_price,
    first_under_price: r.first_under_price ?? r.under_price,
  }));

  const { error } = await supabase
    .from('odds_lines_current')
    .upsert(upserts, {
      onConflict: 'event_id,bookmaker_key,market_key,player,line',
    });

  if (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  console.log('CRON RUN', new Date().toISOString());

  return NextResponse.json({ ok: true, rows: upserts.length });
}
