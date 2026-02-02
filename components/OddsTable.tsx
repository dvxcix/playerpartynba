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

  first_over_price: number | null;
  first_under_price: number | null;

  bookmaker_title: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
   MOVEMENT + COLOR LOGIC
   ========================= */
function movementClass(current: number | null, original: number | null) {
  if (current == null || original == null) return '';
  if (current > original) return '!text-green-600 font-semibold';
  if (current < original) return '!text-red-600 font-semibold';
  return '!text-yellow-400 font-semibold';
}
/* ========================= */

/* =========================
   NUMERIC SORT FUNCTION
   ========================= */
const numericSort = (
  rowA: any,
  rowB: any,
  columnId: string
) => {
  const a = rowA.getValue(columnId);
  const b = rowB.getValue(columnId);

  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  return a - b;
};
/* ========================= */

export default function OddsTable() {
  const { data } = useSWR<{ rows: OddsRow[] }>('/api/odds/latest', fetcher);
  const rows = data?.rows ?? [];

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'line', desc: true },
  ]);

  const columns = React.useMemo<ColumnDef<OddsRow>[]>(() => [
    { accessorKey: 'game', header: 'GAME' },

    { accessorKey: 'player', header: 'PLAYER' },

    {
      id: 'market',
      header: 'MARKET',
      accessorFn: (r) =>
        r.market_name ??
        MARKET_LABELS[r.market_key] ??
        r.market_key,
    },

    {
      accessorKey: 'line',
      header: 'LINE',
      sortingFn: numericSort,
    },

    {
      accessorKey: 'over_price',
      header: 'OVER',
      sortingFn: numericSort,
      cell: ({ row }) => {
        const c = row.original.over_price;
        const o = row.original.first_over_price;

        return (
          <span className="mono">
            {o != null && o !== c && (
              <span className="line-through opacity-60 mr-1">
                {fmtAmerican(o)}
              </span>
            )}
            <span className={movementClass(c, o)}>
              {fmtAmerican(c)}
            </span>
          </span>
        );
      },
    },

    {
      accessorKey: 'under_price',
      header: 'UNDER',
      sortingFn: numericSort,
      cell: ({ row }) => {
        const c = row.original.under_price;
        const o = row.original.first_under_price;

        return (
          <span className="mono">
            {o != null && o !== c && (
              <span className="line-through opacity-60 mr-1">
                {fmtAmerican(o)}
              </span>
            )}
            <span className={movementClass(c, o)}>
              {fmtAmerican(c)}
            </span>
          </span>
        );
      },
    },

    { accessorKey: 'bookmaker_title', header: 'BOOK' },
  ], []);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="tableWrap">
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className="sortable"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext()
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
