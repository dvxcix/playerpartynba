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
  event_id: string;
  commence_time: string | null;
  home_team: string | null;
  away_team: string | null;
  game: string | null;
  bookmaker_key: string | null;
  bookmaker_title: string | null;
  market_key: string;
  market_name: string | null;
  player: string;
  line: number;
  over_price: number | null;
  under_price: number | null;
  last_update: string | null;
  fetched_at: string;
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
  if (n === null || n === undefined) return '—';
  return n > 0 ? `+${n}` : `${n}`;
}

function toLocal(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr)).filter(Boolean) as T[];
}

/* =========================
   COLOR LOGIC
   ========================= */
function overClass(n: number | null) {
  if (n == null) return '';
  return n > 300 ? 'text-green-600 font-semibold' : '';
}

function underClass(n: number | null) {
  if (n == null) return '';
  return n < -210 ? 'text-red-600 font-semibold' : '';
}
/* ========================= */

function CheckboxList({
  title,
  options,
  selected,
  setSelected,
  maxHeight = 220,
}: {
  title: string;
  options: string[];
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
  maxHeight?: number;
}) {
  return (
    <div className="panel">
      <div className="panelHeader">
        <div className="panelTitle">{title}</div>
      </div>
      <div className="panelBody" style={{ maxHeight, overflow: 'auto' }}>
        {options.length === 0 ? (
          <div className="small">(none)</div>
        ) : (
          options.map((o) => (
            <label key={o} className="checkRow">
              <input
                type="checkbox"
                checked={selected.has(o)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(o);
                  else next.delete(o);
                  setSelected(next);
                }}
              />
              <span>{o}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export default function OddsTable() {
  const { data, error, isLoading, mutate } = useSWR<{ rows: OddsRow[] }>(
    '/api/odds/latest',
    fetcher
  );

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
  const bookmakers = React.useMemo(
    () =>
      uniq(
        rows.map(
          (r) => r.bookmaker_title ?? r.bookmaker_key ?? 'Unknown'
        )
      ).sort(),
    [rows]
  );

  // ✅ START WITH NOTHING SELECTED
  const [gameSel, setGameSel] = React.useState<Set<string>>(new Set());
  const [marketSel, setMarketSel] = React.useState<Set<string>>(new Set());
  const [bookSel, setBookSel] = React.useState<Set<string>>(new Set());
  const [playerQuery, setPlayerQuery] = React.useState('');

  // ✅ FILTER: empty selector = show NOTHING
  const filteredRows = React.useMemo(() => {
    if (!gameSel.size || !marketSel.size || !bookSel.size) return [];

    const q = playerQuery.trim().toLowerCase();

    return rows.filter((r) => {
      if (!gameSel.has(r.game ?? 'Unknown')) return false;

      const market =
        r.market_name ??
        MARKET_LABELS[r.market_key] ??
        r.market_key;
      if (!marketSel.has(market)) return false;

      const book =
        r.bookmaker_title ?? r.bookmaker_key ?? 'Unknown';
      if (!bookSel.has(book)) return false;

      if (q && !r.player.toLowerCase().includes(q)) return false;

      return true;
    });
  }, [rows, gameSel, marketSel, bookSel, playerQuery]);

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'line', desc: true },
  ]);

  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      event_id: false,
      commence_time: false,
      last_update: false,
      fetched_at: false,
    });

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
        return (
          <span className={`mono ${overClass(v)}`}>
            {fmtAmerican(v)}
          </span>
        );
      },
    },
    {
      accessorKey: 'under_price',
      header: 'UNDER',
      cell: (i) => {
        const v = i.getValue() as number | null;
        return (
          <span className={`mono ${underClass(v)}`}>
            {fmtAmerican(v)}
          </span>
        );
      },
    },
    { accessorKey: 'bookmaker_title', header: 'BOOK' },
  ], []);

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (error) {
    return <div>Error loading odds.</div>;
  }

  return (
    <div>
      <div className="controls">
        <input
          className="input"
          placeholder="Search player…"
          value={playerQuery}
          onChange={(e) => setPlayerQuery(e.target.value)}
        />
        <button className="button" onClick={() => mutate()} disabled={isLoading}>
          Refresh
        </button>
        <div className="badge">
          Rows: {filteredRows.length.toLocaleString()}
        </div>
      </div>

      <div className="grid2">
        <CheckboxList title="Games" options={games} selected={gameSel} setSelected={setGameSel} />
        <CheckboxList title="Markets" options={markets} selected={marketSel} setSelected={setMarketSel} />
        <CheckboxList title="Books" options={bookmakers} selected={bookSel} setSelected={setBookSel} />
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
        Tip: Select games, markets, and books to load data.
      </div>
    </div>
  );
}
