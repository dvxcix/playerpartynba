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

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmtAmerican(n: number | null) {
  if (n == null) return '—';
  return n > 0 ? `+${n}` : `${n}`;
}

/* ========= COLOR + MOVEMENT ========= */
function moveClass(current: number | null, original: number | null) {
  if (current == null || original == null) return '';
  if (current > original) return '!text-green-600 font-semibold';
  if (current < original) return '!text-red-600 font-semibold';
  return '';
}

function overThreshold(n: number | null) {
  return n != null && n > 300 ? '!text-green-600 font-semibold' : '';
}

function underThreshold(n: number | null) {
  return n != null && n < -210 ? '!text-red-600 font-semibold' : '';
}
/* =================================== */

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
      accessorFn: r => r.market_name ?? r.market_key,
    },
    { accessorKey: 'line', header: 'LINE' },
    {
      header: 'OVER',
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
            <span className={`${moveClass(c, o)} ${overThreshold(c)}`}>
              {fmtAmerican(c)}
            </span>
          </span>
        );
      },
    },
    {
      header: 'UNDER',
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
            <span className={`${moveClass(c, o)} ${underThreshold(c)}`}>
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
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} onClick={h.column.getToggleSortingHandler()}>
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
  );
}
