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
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr)).filter((x) => x !== null && x !== undefined) as T[];
}

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
  const allChecked = options.length > 0 && selected.size === options.length;
  return (
    <div className="panel">
      <div className="panelHeader">
        <div className="panelTitle">{title}</div>
        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => {
              if (e.target.checked) setSelected(new Set(options));
              else setSelected(new Set());
            }}
          />
          All
        </label>
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
  const { data, error, isLoading, mutate } = useSWR<{ rows: OddsRow[] }>('/api/odds/latest', fetcher, {
    refreshInterval: 60_000,
  });

  const rows = data?.rows ?? [];

  const games = React.useMemo(() => uniq(rows.map((r) => r.game ?? 'Unknown')).sort(), [rows]);
  const markets = React.useMemo(() =>
    uniq(
      rows.map((r) => r.market_name ?? MARKET_LABELS[r.market_key] ?? r.market_key)
    ).sort(),
  [rows]);
  const bookmakers = React.useMemo(() => uniq(rows.map((r) => r.bookmaker_title ?? r.bookmaker_key ?? 'Unknown')).sort(), [rows]);

  const [gameSel, setGameSel] = React.useState<Set<string>>(new Set());
  const [marketSel, setMarketSel] = React.useState<Set<string>>(new Set());
  const [bookSel, setBookSel] = React.useState<Set<string>>(new Set());
  const [playerQuery, setPlayerQuery] = React.useState('');

  // Default: select everything once we have options.
  React.useEffect(() => {
    if (games.length && gameSel.size === 0) setGameSel(new Set(games));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length]);
  React.useEffect(() => {
    if (markets.length && marketSel.size === 0) setMarketSel(new Set(markets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets.length]);
  React.useEffect(() => {
    if (bookmakers.length && bookSel.size === 0) setBookSel(new Set(bookmakers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmakers.length]);

  const filteredRows = React.useMemo(() => {
    const q = playerQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const g = r.game ?? 'Unknown';
      const m = r.market_name ?? MARKET_LABELS[r.market_key] ?? r.market_key;
      const b = r.bookmaker_title ?? r.bookmaker_key ?? 'Unknown';

      if (gameSel.size && !gameSel.has(g)) return false;
      if (marketSel.size && !marketSel.has(m)) return false;
      if (bookSel.size && !bookSel.has(b)) return false;
      if (q && !r.player.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, gameSel, marketSel, bookSel, playerQuery]);

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'game', desc: false },
    { id: 'player', desc: false },
    { id: 'market', desc: false },
    { id: 'line', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    event_id: false,
    commence_time: false,
    last_update: false,
    fetched_at: false,
  });

  const columns = React.useMemo<ColumnDef<OddsRow>[]>(
    () => [
      { accessorKey: 'game', header: 'GAME', cell: (info) => <span className="badge">{String(info.getValue() ?? '—')}</span> },
      { accessorKey: 'player', header: 'PLAYER' },
      {
        id: 'market',
        header: 'MARKET',
        accessorFn: (r) => r.market_name ?? MARKET_LABELS[r.market_key] ?? r.market_key,
        cell: (info) => <span className="badge">{String(info.getValue())}</span>,
      },
      {
        accessorKey: 'line',
        header: 'LINE',
        cell: (info) => <span className="mono">{Number(info.getValue()).toString()}</span>,
      },
      {
        accessorKey: 'over_price',
        header: 'OVER',
        cell: (info) => {
          const v = info.getValue() as number | null;
          return <span className={v !== null && v > 0 ? 'good' : 'mono'}>{fmtAmerican(v)}</span>;
        },
      },
      {
        accessorKey: 'under_price',
        header: 'UNDER',
        cell: (info) => {
          const v = info.getValue() as number | null;
          return <span className={v !== null && v < 0 ? 'bad' : 'mono'}>{fmtAmerican(v)}</span>;
        },
      },
      {
        accessorKey: 'bookmaker_title',
        header: 'BOOK',
        cell: (info) => <span className="small">{String(info.getValue() ?? '—')}</span>,
      },
      { accessorKey: 'commence_time', header: 'START', cell: (info) => <span className="small">{toLocal(info.getValue() as string | null)}</span> },
      { accessorKey: 'last_update', header: 'BOOK UPDATE', cell: (info) => <span className="small">{toLocal(info.getValue() as string | null)}</span> },
      { accessorKey: 'fetched_at', header: 'FETCHED', cell: (info) => <span className="small">{toLocal(info.getValue() as string)}</span> },
      { accessorKey: 'event_id', header: 'EVENT ID', cell: (info) => <span className="mono">{String(info.getValue())}</span> },
    ],
    []
  );

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
    enableMultiSort: true,
  });

  const lastFetched = React.useMemo(() => {
    let max = 0;
    for (const r of rows) {
      const t = new Date(r.fetched_at).getTime();
      if (!Number.isNaN(t)) max = Math.max(max, t);
    }
    return max ? new Date(max).toLocaleString() : '—';
  }, [rows]);

  if (error) {
    return (
      <div className="panel">
        <div className="panelHeader"><div className="panelTitle">Error</div></div>
        <div className="panelBody">Failed to load odds. Try refreshing. ({String(error)})</div>
      </div>
    );
  }

  return (
    <div>
      <div className="controls">
        <div className="controlGroup">
          <input
            className="input"
            placeholder="Search player…"
            value={playerQuery}
            onChange={(e) => setPlayerQuery(e.target.value)}
          />
          <button className="button" onClick={() => mutate()} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div className="controlGroup">
          <div className="badge">Rows: {filteredRows.length.toLocaleString()}</div>
          <div className="badge">Last fetched: {lastFetched}</div>
          <details>
            <summary className="pill">Columns</summary>
            <div className="dropdown">
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="checkRow">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                  />
                  <span>{typeof col.columnDef.header === "string" ? col.columnDef.header : col.id.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </details>
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
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sort = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={canSort ? 'sortable' : undefined}
                    >
                      <div className="thInner">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sort ? (
                          <span className="sort">{sort === 'asc' ? '▲' : '▼'}</span>
                        ) : canSort ? (
                          <span className="sort sortHint">↕</span>
                        ) : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="small" style={{ marginTop: 12 }}>
        Tip: Click any column header to sort. Shift-click to multi-sort. Use the “Columns” menu to hide/show columns.
      </div>
    </div>
  );
}
