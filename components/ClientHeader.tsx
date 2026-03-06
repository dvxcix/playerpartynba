'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import PPicon from '@/lib/PPicon.png';
import { usePPP } from '@/components/PPPContext';

/* =========================
TEAM LOGOS
========================= */

import PHI from '@/lib/nbateams/76ers.png';
import MIL from '@/lib/nbateams/BUCKS.png';
import CHI from '@/lib/nbateams/BULLS.png';
import CLE from '@/lib/nbateams/CAVS.png';
import BOS from '@/lib/nbateams/CELTICS.png';
import LAC from '@/lib/nbateams/CLIPPERS.png';
import MEM from '@/lib/nbateams/GRIZZLIES.png';
import ATL from '@/lib/nbateams/HAWKS.png';
import MIA from '@/lib/nbateams/HEAT.gif';
import CHA from '@/lib/nbateams/HORNETS.png';
import UTA from '@/lib/nbateams/JAZZ.png';
import SAC from '@/lib/nbateams/KINGS.png';
import NYK from '@/lib/nbateams/KNICKS.png';
import LAL from '@/lib/nbateams/LAKERS.png';
import ORL from '@/lib/nbateams/MAGIC.png';
import DAL from '@/lib/nbateams/MAVERICKS.png';
import BKN from '@/lib/nbateams/NETS.png';
import DEN from '@/lib/nbateams/NUGGETS.png';
import IND from '@/lib/nbateams/PACERS.png';
import NOP from '@/lib/nbateams/PELICANS.png';
import DET from '@/lib/nbateams/PISTONS.png';
import TOR from '@/lib/nbateams/RAPTORS.png';
import HOU from '@/lib/nbateams/ROCKETS.png';
import SAS from '@/lib/nbateams/SPURS.gif';
import PHX from '@/lib/nbateams/SUNS.png';
import OKC from '@/lib/nbateams/THUNDER.png';
import MIN from '@/lib/nbateams/TIMBERWOLVES.png';
import POR from '@/lib/nbateams/TRAILBLAZERS.png';
import GSW from '@/lib/nbateams/WARRIORS.png';
import WAS from '@/lib/nbateams/WIZARDS.png';

const TEAM_LOGOS: Record<string, any> = {
  PHI,
  MIL,
  CHI,
  CLE,
  BOS,
  MEM,
  ATL,
  MIA,
  CHA,
  UTA,
  SAC,
  NYK,
  LAL,
  ORL,
  DAL,
  BKN,
  DEN,
  IND,
  NOP,
  DET,
  TOR,
  HOU,
  SAS,
  PHX,
  OKC,
  MIN,
  POR,
  GSW,
  WAS,
  LAC,
  'LOS ANGELES CLIPPERS': LAC,
  'LA CLIPPERS': LAC,
};

function normalizeTeamKey(team: string) {
  return team.toUpperCase().trim();
}

function GameLogos({ game }: { game: string }) {
  const [awayRaw, homeRaw] = game.split('@');
  const AwayLogo = TEAM_LOGOS[normalizeTeamKey(awayRaw)];
  const HomeLogo = TEAM_LOGOS[normalizeTeamKey(homeRaw)];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {AwayLogo && <Image src={AwayLogo} alt={awayRaw} width={22} height={22} />}
      <span>@</span>
      {HomeLogo && <Image src={HomeLogo} alt={homeRaw} width={22} height={22} />}
    </div>
  );
}

/* =========================
TYPES
========================= */

type OddsRow = {
  game: string;
  player: string;
  market_name: string;
  line: number;
  bookmaker_title: string;
  over_price: number | null;
  under_price?: number | null;
};

type PPPPick = {
  game: string;
  player: string;
  signalMarket: string;
  signalLines: string;
  strength: 'Spike' | 'Super Spike' | 'Nuclear Spike';
  suggestion: string;
  suggestionOdds: number | null;
  signalKey: string;
  suggestionKey: string;
};

/* =========================
HELPERS
========================= */

const SIGNAL_MIN = -130;
const SIGNAL_MAX = -105;

const ALLOWED_SIGNAL_MARKETS = new Set([
  'Alt Points',
  'Alt Rebounds',
  'Alt Assists',
  'Alt Threes',
]);

function toNum(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function rowKey(row: OddsRow) {
  return `${row.game}|${row.player}|${row.market_name}|${row.line}|${row.bookmaker_title}`;
}

function formatOdds(price: number | null) {
  if (price == null) return '—';
  return price > 0 ? `+${price}` : `${price}`;
}

function formatSuggestedLine(row: OddsRow | null) {
  if (!row) return 'No correlated alt found';

  const label =
    row.market_name === 'Alt Points'
      ? 'PTS'
      : row.market_name === 'Alt Rebounds'
        ? 'REB'
        : row.market_name === 'Alt Assists'
          ? 'AST'
          : row.market_name === 'Alt Threes'
            ? '3PM'
            : row.market_name.replace('Alt ', '');

  return `${Math.ceil(row.line)}+ ${label}`;
}

function getStrength(count: number): PPPPick['strength'] {
  if (count >= 4) return 'Nuclear Spike';
  if (count >= 3) return 'Super Spike';
  return 'Spike';
}

function marketPriority(market: string): number {
  if (market === 'Alt Points') return 1;
  if (market === 'Alt Assists') return 2;
  if (market === 'Alt Rebounds') return 3;
  if (market === 'Alt Threes') return 4;
  return 99;
}

function preferredTargets(signalMarket: string): string[] {
  if (signalMarket === 'Alt Points') return ['Alt Assists', 'Alt Threes', 'Alt Rebounds'];
  if (signalMarket === 'Alt Assists') return ['Alt Points', 'Alt Threes'];
  if (signalMarket === 'Alt Rebounds') return ['Alt Points', 'Alt Threes'];
  if (signalMarket === 'Alt Threes') return ['Alt Points', 'Alt Assists'];
  return [];
}

function targetBand(targetMarket: string) {
  if (targetMarket === 'Alt Assists') return { min: 100, max: 260, ideal: 140 };
  if (targetMarket === 'Alt Threes') return { min: 100, max: 260, ideal: 145 };
  if (targetMarket === 'Alt Points') return { min: 100, max: 300, ideal: 150 };
  if (targetMarket === 'Alt Rebounds') return { min: 100, max: 260, ideal: 140 };
  return { min: 100, max: 300, ideal: 145 };
}

function chooseSuggestedRow(playerRows: OddsRow[], signalMarket: string): OddsRow | null {
  const targets = preferredTargets(signalMarket);

  for (const targetMarket of targets) {
    const band = targetBand(targetMarket);

    const candidates = playerRows
      .filter(
        (row) =>
          row.bookmaker_title === 'FanDuel' &&
          row.market_name === targetMarket &&
          toNum(row.over_price) != null
      )
      .filter((row) => {
        const over = toNum(row.over_price);
        return over != null && over >= band.min && over <= band.max;
      })
      .sort((a, b) => {
        const aOver = toNum(a.over_price) ?? 0;
        const bOver = toNum(b.over_price) ?? 0;
        const aDiff = Math.abs(aOver - band.ideal);
        const bDiff = Math.abs(bOver - band.ideal);

        if (aDiff !== bDiff) return aDiff - bDiff;
        if (a.line !== b.line) return a.line - b.line;
        return aOver - bOver;
      });

    if (candidates.length > 0) return candidates[0];
  }

  for (const targetMarket of targets) {
    const band = targetBand(targetMarket);

    const fallback = playerRows
      .filter(
        (row) =>
          row.bookmaker_title === 'FanDuel' &&
          row.market_name === targetMarket &&
          toNum(row.over_price) != null
      )
      .sort((a, b) => {
        const aOver = toNum(a.over_price) ?? 0;
        const bOver = toNum(b.over_price) ?? 0;
        const aDiff = Math.abs(aOver - band.ideal);
        const bDiff = Math.abs(bOver - band.ideal);

        if (aDiff !== bDiff) return aDiff - bDiff;
        if (a.line !== b.line) return a.line - b.line;
        return aOver - bOver;
      });

    if (fallback.length > 0) return fallback[0];
  }

  return null;
}

function buildPPPPicks(rows: OddsRow[]): PPPPick[] {
  const fanDuelRows = rows.filter((row) => row.bookmaker_title === 'FanDuel');

  const grouped = new Map<string, OddsRow[]>();

  for (const row of fanDuelRows) {
    if (!row.player || !row.game || !row.market_name) continue;

    const key = `${row.game}|${row.player}`;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  const picks: PPPPick[] = [];

  for (const [groupKey, playerRows] of grouped.entries()) {
    const signalCandidates = playerRows
      .filter((row) => ALLOWED_SIGNAL_MARKETS.has(row.market_name))
      .filter((row) => {
        const over = toNum(row.over_price);
        return over != null && over >= SIGNAL_MIN && over <= SIGNAL_MAX;
      });

    if (signalCandidates.length < 2) continue;

    const byMarket = new Map<string, OddsRow[]>();
    for (const row of signalCandidates) {
      const existing = byMarket.get(row.market_name) ?? [];
      existing.push(row);
      byMarket.set(row.market_name, existing);
    }

    const marketClusters = [...byMarket.entries()]
      .map(([market, clusterRows]) => ({
        market,
        rows: clusterRows.sort((a, b) => a.line - b.line),
      }))
      .filter((entry) => entry.rows.length >= 2)
      .sort((a, b) => {
        if (b.rows.length !== a.rows.length) return b.rows.length - a.rows.length;
        const aAvg =
          a.rows.reduce((sum, row) => sum + (toNum(row.over_price) ?? 0), 0) / a.rows.length;
        const bAvg =
          b.rows.reduce((sum, row) => sum + (toNum(row.over_price) ?? 0), 0) / b.rows.length;

        const aDiff = Math.abs(aAvg - -114);
        const bDiff = Math.abs(bAvg - -114);

        if (aDiff !== bDiff) return aDiff - bDiff;
        return marketPriority(a.market) - marketPriority(b.market);
      });

    if (marketClusters.length === 0) continue;

    const bestCluster = marketClusters[0];
    const suggestionRow = chooseSuggestedRow(playerRows, bestCluster.market);
    const [game, player] = groupKey.split('|');

    picks.push({
      game,
      player,
      signalMarket: bestCluster.market,
      signalLines: bestCluster.rows
        .map((row) => `${row.line} (${formatOdds(toNum(row.over_price))})`)
        .join(', '),
      strength: getStrength(bestCluster.rows.length),
      suggestion: formatSuggestedLine(suggestionRow),
      suggestionOdds: suggestionRow ? toNum(suggestionRow.over_price) : null,
      signalKey: rowKey(bestCluster.rows[0]),
      suggestionKey: suggestionRow ? rowKey(suggestionRow) : rowKey(bestCluster.rows[0]),
    });
  }

  return picks.sort((a, b) => {
    if (a.game !== b.game) return a.game.localeCompare(b.game);
    return a.player.localeCompare(b.player);
  });
}

/* =========================
COMPONENT
========================= */

export default function ClientHeader() {
  const [showPPP, setShowPPP] = useState(false);
  const [pppRows, setPppRows] = useState<PPPPick[]>([]);
  const [loadingPPP, setLoadingPPP] = useState(false);

  const {
    setPppKeys,
    pppCount,
    setPppCount,
    scrollToKey,
  } = usePPP();

  const modalRef = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const onMouseMove = (e: MouseEvent) => {
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!modalRef.current) return;

    const rect = modalRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!showPPP) return;

    setLoadingPPP(true);

    fetch('/api/odds/latest')
      .then((r) => r.json())
      .then((data) => {
        const rawRows: OddsRow[] = Array.isArray(data.rows) ? data.rows : [];
        const picks = buildPPPPicks(rawRows);

        setPppRows(picks);
        setPppCount(picks.length);

        setPppKeys(
          new Set(picks.flatMap((pick) => [pick.signalKey, pick.suggestionKey]))
        );
      })
      .catch(() => {
        setPppRows([]);
        setPppCount(0);
        setPppKeys(new Set());
      })
      .finally(() => setLoadingPPP(false));
  }, [showPPP, setPppCount, setPppKeys]);

  const copyText = useMemo(() => {
    return pppRows
      .map(
        (row) =>
          `${row.game} | ${row.player} | ${row.strength} | Signal: ${row.signalMarket} -> ${row.signalLines} | Play: ${row.suggestion}${row.suggestionOdds != null ? ` (${formatOdds(row.suggestionOdds)})` : ''}`
      )
      .join('\n')
      .trim();
  }, [pppRows]);

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Image src={PPicon} alt="PlayerParty" width={36} height={36} priority />
          <div>
            <div className="title">NBA Dashboard | PlayerParty (v A3.21)</div>
            <div className="subtitle">
              Check all odds for NBA games on Today, updated every 15min.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="pill"
            style={{
              background: 'linear-gradient(135deg, #f5c542, #d4a017)',
              color: '#000',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={() => setShowPPP(true)}
          >
            <span>👑 PPP</span>
            <span
              style={{
                background: 'rgba(0,0,0,0.15)',
                padding: '2px 8px',
                borderRadius: 999,
                fontWeight: 800,
              }}
            >
              {pppCount}
            </span>
          </button>

          <a className="pill" href="/api/odds/csv" target="_blank" rel="noreferrer">
            Export CSV
          </a>
        </div>
      </header>

      {showPPP && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 1000,
          }}
          onClick={() => setShowPPP(false)}
        >
          <div
            ref={modalRef}
            className="panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: position ? position.y : '10%',
              left: position ? position.x : '10%',
              minWidth: 760,
              minHeight: 320,
              maxWidth: '95vw',
              maxHeight: '85vh',
              resize: 'both',
              overflow: 'auto',
              cursor: 'default',
            }}
          >
            <div
              className="panelHeader"
              style={{ cursor: 'move', userSelect: 'none' }}
              onMouseDown={onMouseDown}
            >
              <div className="panelTitle">👑 PlayerPartyPicks</div>
            </div>

            <button
              onClick={() => setShowPPP(false)}
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                fontSize: 18,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <div className="panelBody">
              {loadingPPP && <div>Loading…</div>}

              {!loadingPPP && pppRows.length === 0 && (
                <div>No PlayerPartyPicks found.</div>
              )}

              {!loadingPPP && pppRows.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button
                      className="pill"
                      onClick={() => {
                        navigator.clipboard.writeText(copyText);
                      }}
                    >
                      📋 Copy
                    </button>

                    <button
                      className="pill"
                      onClick={() => {
                        const parlayText = pppRows
                          .map(
                            (row) =>
                              `${row.player} ${row.suggestion}${row.suggestionOdds != null ? ` (${formatOdds(row.suggestionOdds)})` : ''} (${row.game})`
                          )
                          .join('\n');

                        alert(`PPP Parlay:\n\n${parlayText}`);
                      }}
                    >
                      🧾 Build Parlay
                    </button>
                  </div>

                  <table className="table">
                    <thead>
                      <tr>
                        <th>Game</th>
                        <th>Player</th>
                        <th>Strength</th>
                        <th>Signal Market</th>
                        <th>Cluster</th>
                        <th>Exact Spike Line</th>
                        <th>Play</th>
                        <th>Play Odds</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pppRows.map((row, i) => {
                        const exactSignalLine = row.signalLines.split(', ')[0] ?? row.signalLines;

                        return (
                          <tr
                            key={i}
                            style={{ cursor: 'pointer' }}
                            onClick={() => scrollToKey(row.suggestionKey)}
                            title="Click to scroll to suggested play"
                          >
                            <td>
                              <GameLogos game={row.game} />
                            </td>
                            <td>{row.player}</td>
                            <td>{row.strength}</td>
                            <td>{row.signalMarket}</td>
                            <td>{row.signalLines}</td>
                            <td>{exactSignalLine}</td>
                            <td>{row.suggestion}</td>
                            <td>{formatOdds(row.suggestionOdds)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
