import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 1000;

export async function GET(req: Request) {
  try {
    const CRON_SECRET = process.env.CRON_SECRET;

    // Only enforce auth if CRON_SECRET exists
    if (CRON_SECRET) {
      const authHeader = req.headers.get('authorization');

      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { ok: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const supabase = supabaseServer();

    let allRows: any[] = [];
    let from = 0;
    let to = PAGE_SIZE - 1;

    while (true) {
      const { data, error } = await supabase
        .from('odds_lines_current')
        .select('*')
        .range(from, to);

      if (error) {
        return NextResponse.json(
          { ok: false, error },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        break;
      }

      allRows.push(...data);

      // If we got less than a full page, we're done
      if (data.length < PAGE_SIZE) {
        break;
      }

      from += PAGE_SIZE;
      to += PAGE_SIZE;
    }

    return NextResponse.json(
      {
        ok: true,
        rows: allRows,
        count: allRows.length,
      },
      {
        headers: {
          'cache-control': 'no-store',
        },
      }
    );
  } catch (err) {
    console.error('odds/latest route error:', err);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
    if (error) {
      return NextResponse.json(
        { ok: false, error },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
    to += PAGE_SIZE;
  }

  return NextResponse.json(
    {
      ok: true,
      rows: allRows,
      count: allRows.length,
    },
    {
      headers: {
        'cache-control': 'no-store',
      },
    }
  );
}      break;
    }

    from += PAGE_SIZE;
    to += PAGE_SIZE;
  }

  return NextResponse.json(
    {
      ok: true,
      rows: allRows,
      count: allRows.length,
    },
    {
      headers: {
        'cache-control': 'no-store',
      },
    }
  );
}
