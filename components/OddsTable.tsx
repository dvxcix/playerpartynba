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

  // 👇 REQUIRED for movement
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
  return '!text-yellow-400 font-semibold'; // unchanged
}
/* ========================= */

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr)).filter(Boolean) as T[];
}

function CheckboxList({
  title,
  options,
  selected,
  setSelected,
}: {
  title: string;
  options: (string | number)[];
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
}) {
  return (
    <div className="panel">
      <div className="panelHeader">
        <div className="panelTitle">{title}</div>
      </div>
      <div className="panelBody" style={{ maxHeight: 220, overflow: 'auto' }}>
        {options.map((o) => {
          const key = String(o);
          return (
            <label key={key} className="checkRow">
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(key);
                  else next.delete(key);
                  setSelected(next);
                }}
              />
              <span>{key}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function OddsTable() {
  const { data } = useSWR<{ rows: OddsRow[] }>('/api/odds/latest', fetcher);
  const rows = data?.rows ?? [];

  const games = React.useMemo(
    () => uniq(rows.map((r) => r.game ?? 'Unknown')).sort(),
    [rows]
  );
  const markets = React.useMemo(
    () =>
      uniq(
        rows.map(
          (r) =>
            r.market_name ??
            MARKET_LABELS[r.market_key] ??
            r.market_key
        )
      ).sort(),
    [rows]
  );
  const books = React.useMemo(
    () => uniq(rows.map((r) => r.bookmaker_title ?? 'Unknown')).sort(),
    [rows]
  );

  const [gameSel, setGameSel] = React.useState<Set<string>>(new Set());
  const [marketSel, setMarketSel] = React.useState<Set<string>>(new Set());
  const [bookSel, setBookSel] = React.useState<Set<string>>(new Set());

  const filteredRows = React.useMemo(() => {
    if (!gameSel.size || !marketSel.size || !bookSel.size) return [];

    return rows.filter((r) => {
      if (!gameSel.has(r.game ?? 'Unknown')) return false;

      const market =
        r.market_name ??
        MARKET_LABELS[r.market_key] ??
        r.market_key;
      if (!marketSel.has(market)) return false;

      if (!bookSel.has(r.bookmaker_title ?? 'Unknown')) return false;

      return true;
    });
  }, [rows, gameSel, marketSel, bookSel]);

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
            <span className={movementClass(c, o)}>
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
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div>
      <div className="grid2">
        <CheckboxList title="Games" options={games} selected={gameSel} setSelected={setGameSel} />
        <CheckboxList title="Markets" options={markets} selected={marketSel} setSelected={setMarketSel} />
        <CheckboxList title="Books" options={books} selected={bookSel} setSelected={setBookSel} />
      </div>

      <div className="tableWrap">
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id}>
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="small" style={{ marginTop: 12 }}>
        Tip: Original odds are struck through. Green = moved up, Red = moved down, Yellow = unchanged.
      </div>
    </div>
  );
}
