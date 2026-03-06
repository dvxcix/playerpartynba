import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

function isCompressionEdge(under: number | null) {
  if (under === null) return false
  return under >= -118 && under <= -112
}

function marketWeight(market: string) {
  const m = market.toLowerCase()

  if (m.includes('threes')) return 30
  if (m.includes('assists')) return 25
  if (m.includes('rebounds')) return 20
  if (m.includes('points')) return 15

  return 10
}

function ladderScore(price: number | null) {
  if (!price) return 0

  if (price >= 500) return 40
  if (price >= 300) return 25
  if (price >= 200) return 15

  return 0
}

export async function GET() {
  try {
    const supabase = supabaseServer()

    let allRows: any[] = []
    let from = 0
    let finished = false

    while (!finished) {
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('odds_lines_current')
        .select('*')
        .range(from, to)

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        )
      }

      if (!data || data.length === 0) {
        finished = true
        break
      }

      allRows.push(...data)

      if (data.length < PAGE_SIZE) {
        finished = true
      } else {
        from += PAGE_SIZE
      }
    }

    /* =========================
       SPIKE DETECTION
    ========================= */

    const spikes: any[] = []

    for (const row of allRows) {
      if (!isCompressionEdge(row.under_price)) continue

      const score =
        ladderScore(row.over_price) +
        marketWeight(row.market_name)

      spikes.push({
        ...row,
        spike_score: score
      })
    }

    /* =========================
       GROUP SPIKES BY GAME
    ========================= */

    const grouped: Record<string, any[]> = {}

    for (const s of spikes) {
      if (!grouped[s.game]) grouped[s.game] = []
      grouped[s.game].push(s)
    }

    /* =========================
       MODEL PARLAY
       (best spike per game)
    ========================= */

    const modelParlay: any[] = []

    for (const game in grouped) {
      const best = grouped[game].sort(
        (a, b) => b.spike_score - a.spike_score
      )[0]

      if (best) modelParlay.push(best)
    }

    return NextResponse.json(
      {
        ok: true,
        rows: allRows,
        spikes,
        model_parlay: modelParlay,
        count: allRows.length
      },
      {
        headers: {
          'cache-control': 'no-store'
        }
      }
    )
  } catch (err: any) {
    console.error('odds/latest route error:', err)

    return NextResponse.json(
      {
        ok: false,
        error: 'Server error'
      },
      { status: 500 }
    )
  }
}
