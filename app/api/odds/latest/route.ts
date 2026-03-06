import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

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

    return NextResponse.json(
      {
        ok: true,
        rows: allRows,
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
