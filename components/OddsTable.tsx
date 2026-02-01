'use client';

import React from 'react';
import useSWR from 'swr';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

type OddsRow = {
  game: string | null;
  market_key: string;
  market_name: string | null;
  player: string;
  line: number;
  over_price: number | null;
  under_price: number | null;
  bookmaker_title: string | null;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

const MARKET_LABELS: Record<string, string> = {
  player_points_alternate: 'Alt Points',
  player_rebounds_alternate: 'Alt Rebounds',
  player_assists_alternate: 'Alt Assists',
  player_blocks_alternate: 'Alt Blocks',
  player_steals_alternate: 'Alt Steals',
  player_turnovers_alternate: 'Alt Turnovers',
  player_threes_alternate: 'Alt 3PT Made',
  player_points_assists_alternate: 'Alt Points+Assists',
  player_points_rebounds_alternate: 'Alt Points+Rebounds',
  player_rebounds_assists_alternate: 'Alt Rebounds+Assists',
  player_points_rebounds_assists_alternate: 'Alt Pts+Reb+Ast',
};

function fmtAmerican(n: number | null) {
  if (n == null) return '—';
  return n > 0 ? `+${n}` : `${n}`;
}

/* =========================
   COLOR LOGIC (FIXED)
   ========================= */
function overClass(n: number | null) {
  if (n == null) return '';
  return n > 300 ? '!text-green-600 font-semibold' : '';
}

function underClass(n: number | null) {
  if (n == null) return '';
  return n < -210 ? '!text-red-600 font-semibold' : '';
}
/* ========================= */

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr)).filter(Boolean) as T[];
}

export default function OddsTable() {
  const { data } = useSWR<{ rows: OddsRow[] }>('/api/odds/latest', fetcher);
  const rows = data?.rows ?? [];

  /* ===== Dimensions ===== */
  const games = React.useMemo(
    () => uniq(rows.map(r => r.game ?? 'Unknown')).sort(),
    [rows]
  );
  const markets = React.useMemo(
    () =>
      uniq(
        rows.map(
          r =>
            r.market_name ??
            MARKET_LABELS[r.market_key] ??
            r.market_key
        )
      ).sort(),
    [rows]
  );
  const books = React.useMemo(
    () => uniq(rows.map(r => r.bookmaker_title ?? 'Unknown')).sort(),
    [rows]
  );

  const overValues = React.useMemo(
    () => rows.map(r => r.over_price).filter(v => v != null) as number[],
    [rows]
  );
  const underValues = React.useMemo(
    () => rows.map(r => r.under_price).filter(v => v != null) as number[],
    [rows]
  );

  const overMin = Math.min(...overValues);
  const overMax = Math.max(...overValues);
  const underMin = Math.min(...underValues);
  const underMax = Math.max(...underValues);

  /* ===== Filters ===== */
  const [gameSel, setGameSel] = React.useState<Set<string>>(new Set());
  const [marketSel, setMarketSel] = React.useState<Set<string>>(new Set());
  const [bookSel, setBookSel] = React.useState<Set<string>>(new Set());

  const [overRange, setOverRange] = React.useState<[number, number]>([overMin, overMax]);
  const [underRange, setUnderRange] = React.useState<[number, number]>([underMin, underMax]);

  /* ===== Filtering ===== */
  const filteredRows = React.useMemo(() => {
    if (!gameSel.size || !marketSel.size || !bookSel.size) return [];

    return rows.filter(r => {
      if (!gameSel.has(r.game ?? 'Unknown')) return false;

      const market =
        r.market_name ??
        MARKET_LABELS[r.market_key] ??
        r.market_key;
      if (!marketSel.has(market)) return false;

      if (!bookSel.has(r.bookmaker_title ?? 'Unknown')) return false;

      if (r.over_price != null) {
        if (r.over_price < overRange[0] || r.over_price > overRange[1]) return false;
      }

      if (r.under_price != null) {
        if (r.under_price < underRange[0] || r.under_price > underRange[1]) return false;
      }

      return true;
    });
  }, [rows, gameSel, marketSel, bookSel, overRange, underRange]);

  /* ===== Table ===== */
  const columns = React.useMemo<ColumnDef<OddsRow>[]>(() => [
    { accessorKey: 'game', header: 'GAME' },
    { accessorKey: 'player', header: 'PLAYER' },
    {
      id: 'market',
      header: 'MARKET',
      accessorFn: r =>
        r.market_name ??
        MARKET_LABELS[r.market_key] ??
        r.market_key,
    },
    { accessorKey: 'line', header: 'LINE' },
    {
      accessorKey: 'over_price',
      header: 'OVER',
      cell: i => {
        const v = i.getValue() as number | null;
        return <span className={`${overClass(v)} mono`}>{fmtAmerican(v)}</span>;
      },
    },
    {
      accessorKey: 'under_price',
      header: 'UNDER',
      cell: i => {
        const v = i.getValue() as number | null;
        return <span className={`${underClass(v)} mono`}>{fmtAmerican(v)}</span>;
      },
    },
    { accessorKey: 'bookmaker_title', header: 'BOOK' },
  ], []);

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting: [{ id: 'line', desc: true }],
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div>
      {/* ===== Filters ===== */}
      <div className="grid2">
        <div className="panel">
          <div className="panelTitle">OVER Odds Range</div>
          <input
            type="range"
            min={overMin}
            max={overMax}
            value={overRange[1]}
            onChange={e => setOverRange([overMin, Number(e.target.value)])}
          />
          <div className="small">
            {fmtAmerican(overRange[0])} → {fmtAmerican(overRange[1])}
          </div>
        </div>

        <div className="panel">
          <div className="panelTitle">UNDER Odds Range</div>
          <input
            type="range"
            min={underMin}
            max={underMax}
            value={underRange[1]}
            onChange={e => setUnderRange([underMin, Number(e.target.value)])}
          />
          <div className="small">
            {fmtAmerican(underRange[0])} → {fmtAmerican(underRange[1])}
          </div>
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className="tableWrap">
        <table className="table">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="small" style={{ marginTop: 12 }}>
        Tip: Use odds sliders to narrow ranges like Excel.
      </div>
    </div>
  );
}
