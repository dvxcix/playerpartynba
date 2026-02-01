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
  ColumnFiltersState,
  VisibilityState,
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

/* ========= COLOR LOGIC (FIXED) ========= */
function overClass(n: number | null) {
  if (n == null) return '';
  return n > 300 ? 'text-green-600 font-semibold' : '';
}
function underClass(n: number | null) {
  if (n == null) return '';
  return n < -210 ? 'text-red-600 font-semibold' : '';
}
/* ====================================== */

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

  // Dimension lists
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

  const overOdds = React.useMemo(
    () => uniq(rows.map((r) => r.over_price).filter((v) => v != null)).sort((a, b) => Number(a) - Number(b)),
    [rows]
  );
  const underOdds = React.useMemo(
    () => uniq(rows.map((r) => r.under_price).filter((v) => v != null)).sort((a, b) => Number(a) - Number(b)),
    [rows]
  );

  // Start with NOTHING selected
  const [gameSel, setGameSel] = React.useState<Set<string>>(new Set());
  const [marketSel, setMarketSel] = React.useState<Set<string>>(new Set());
  const [bookSel, setBookSel] = React.useState<Set<string>>(new Set());
  const [overSel, setOverSel] = React.useState<Set<string>>(new Set());
  const [underSel, setUnderSel] = React.useState<Set<string>>(new Set());

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

      if (overSel.size && !overSel.has(String(r.over_price))) return false;
      if (underSel.size && !underSel.has(String(r.under_price))) return false;

      return true;
    });
  }, [rows, gameSel, marketSel, bookSel, overSel, underSel]);

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
      accessorKey: 'over_price',
      header: 'OVER',
      cell: (i) => {
        const v = i.getValue() as number | null;
        return <span className={`mono ${overClass(v)}`}>{fmtAmerican(v)}</span>;
      },
    },
    {
      accessorKey: 'under_price',
      header: 'UNDER',
      cell: (i) => {
        const v = i.getValue() as number | null;
        return <span className={`mono ${underClass(v)}`}>{fmtAmerican(v)}</span>;
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
        <CheckboxList title="OVER Odds" options={overOdds.map(fmtAmerican)} selected={overSel} setSelected={setOverSel} />
        <CheckboxList title="UNDER Odds" options={underOdds.map(fmtAmerican)} selected={underSel} setSelected={setUnderSel} />
      </div>

      <div className="tableWrap">
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} onClick={h.column.getToggleSortingHandler()}>
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
        Tip: Select Games → Markets → Books → OVER/UNDER odds to narrow like Excel.
      </div>
    </div>
  );
}
