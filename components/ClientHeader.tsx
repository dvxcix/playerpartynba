'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
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

type PPPRow = {
  game: string;
  player: string;
  market_name: string;
  line: number;
  bookmaker_title: string;
  over_price: number;
  under_price: number;

  score?: number;
  spike_market?: string;
  spike_line?: number;
  spike_odds?: number;
  spike_book?: string;
  bet?: string;
  read?: string;
  anchor_market_type?: string;
  spike_market_type?: string;
  tier?: 'SPIKE' | 'NUKE';
};

type HeavyLegRow = {
  game: string;
  player: string;
  market_name: string;
  line: number;
  bookmaker_title: string;
  price: number;
};

/* =========================
SPIKE ENGINE
========================= */

const ANCHOR_PRICES = new Set([-114, -118]);
const MIN_SPIKE_ODDS = 150;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getMarketType(market: string): 'PTS' | 'REB' | 'AST' | '3PM' | 'OTHER' {
  const m = market.toLowerCase();

  if (m.includes('threes')) return '3PM';
  if (m.includes('assists')) return 'AST';
  if (m.includes('rebounds')) return 'REB';
  if (m.includes('points')) return 'PTS';

  return 'OTHER';
}

function isAnchor(row: PPPRow): boolean {
  return ANCHOR_PRICES.has(row.under_price);
}

function allowedSpike(anchorType: string, spikeType: string): boolean {
  if (anchorType === 'PTS') return spikeType === 'REB' || spikeType === 'AST' || spikeType === '3PM';
  if (anchorType === 'REB') return spikeType === 'PTS' || spikeType === 'AST';
  if (anchorType === 'AST') return spikeType === 'PTS' || spikeType === '3PM';
  if (anchorType === '3PM') return spikeType === 'PTS';
  return false;
}

function minRequiredJump(marketType: string): number {
  if (marketType === 'PTS') return 4;
  if (marketType === 'REB') return 3;
  if (marketType === 'AST') return 3;
  if (marketType === '3PM') return 2;
  return 999;
}

function calculateJump(anchorLine: number, spikeLine: number): number {
  return spikeLine - anchorLine;
}

function calculateSpikeScore(anchor: PPPRow, spike: PPPRow): number {
  const anchorType = getMarketType(anchor.market_name);
  const spikeType = getMarketType(spike.market_name);
  const jump = calculateJump(anchor.line, spike.line);

  let score = 1000;

  score += spike.over_price * 0.5;

  if (allowedSpike(anchorType, spikeType)) score += 140;

  if (spikeType === 'AST') score += 40;
  else if (spikeType === 'REB') score += 30;
  else if (spikeType === 'PTS') score += 20;
  else if (spikeType === '3PM') score += 25;

  if (jump === minRequiredJump(spikeType)) score += 60;
  else if (jump === minRequiredJump(spikeType) + 1) score += 35;
  else if (jump >= minRequiredJump(spikeType) + 2) score += 10;

  if (spike.over_price >= 200) score += 15;
  if (spike.over_price >= 300) score += 25;
  if (spike.over_price >= 500) score += 40;

  return Math.round(score);
}

function buildRead(anchor: PPPRow, spike: PPPRow): string {
  const anchorType = getMarketType(anchor.market_name);
  const spikeType = getMarketType(spike.market_name);

  const anchorLabel =
    anchorType === '3PM'
      ? 'threes'
      : anchorType === 'AST'
        ? 'assists'
        : anchorType === 'REB'
          ? 'rebounds'
          : 'points';

  const spikeLabel =
    spikeType === '3PM'
      ? 'threes'
      : spikeType === 'AST'
        ? 'assists'
        : spikeType === 'REB'
          ? 'rebounds'
          : 'points';

  if (anchorType !== spikeType) {
    return `${anchorLabel} anchor → ${spikeLabel} spike`;
  }

  return `${spikeLabel} ladder spike`;
}

function buildBet(spike: PPPRow): string {
  return `OVER ${spike.line}`;
}

function spikeTier(score: number): 'SPIKE' | 'NUKE' {
  return score >= 1180 ? 'NUKE' : 'SPIKE';
}

/* =========================
COMPONENT
========================= */

export default function ClientHeader() {
  const [showPPP, setShowPPP] = useState(false);
  const [pppRows, setPppRows] = useState<PPPRow[]>([]);
  const [heavyLegRows, setHeavyLegRows] = useState<HeavyLegRow[]>([]);
  const [loadingPPP, setLoadingPPP] = useState(false);
  const [gameFilter, setGameFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

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

  const runManualRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);

    try {
      const res = await fetch('/api/cron/fetch-odds', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Manual refresh failed: ${res.status}`);
      }
    } catch (err) {
      console.error('Manual refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  /* =========================
  FETCH + STRICT PPP ENGINE
  ========================= */

  useEffect(() => {
    if (!showPPP) return;

    setLoadingPPP(true);

    fetch('/api/odds/latest')
      .then((r) => r.json())
      .then((data) => {
        const rows: PPPRow[] = Array.isArray(data?.rows) ? data.rows : [];

        const cleanedRows = rows.filter(
          (r) =>
            typeof r.player === 'string' &&
            typeof r.market_name === 'string' &&
            typeof r.game === 'string' &&
            typeof r.bookmaker_title === 'string' &&
            isFiniteNumber(r.line) &&
            isFiniteNumber(r.over_price) &&
            isFiniteNumber(r.under_price)
        );

        const heavyLegSourceRows = rows.filter(
          (r) =>
            typeof r.player === 'string' &&
            typeof r.market_name === 'string' &&
            typeof r.game === 'string' &&
            typeof r.bookmaker_title === 'string' &&
            isFiniteNumber(r.line) &&
            isFiniteNumber(r.over_price)
        );

        const heavyRows: HeavyLegRow[] = heavyLegSourceRows
          .filter((r) => r.over_price === -600 || r.over_price === -1200)
          .map((r) => ({
            game: r.game,
            player: r.player,
            market_name: r.market_name,
            line: r.line,
            bookmaker_title: r.bookmaker_title,
            price: r.over_price,
          }))
          .sort(
            (a, b) =>
              a.game.localeCompare(b.game) ||
              a.player.localeCompare(b.player) ||
              a.market_name.localeCompare(b.market_name) ||
              a.line - b.line ||
              a.price - b.price ||
              a.bookmaker_title.localeCompare(b.bookmaker_title)
          );

        const anchors = cleanedRows.filter((r) => {
          const anchorType = getMarketType(r.market_name);
          return isAnchor(r) && anchorType !== 'OTHER';
        });

        const bestSpikeByPlayer = new Map<string, PPPRow>();

        for (const anchor of anchors) {
          const anchorType = getMarketType(anchor.market_name);

          const samePlayerRows = cleanedRows.filter((r) => r.player === anchor.player);

          for (const spike of samePlayerRows) {
            const spikeType = getMarketType(spike.market_name);

            if (spikeType === 'OTHER') continue;
            if (spike.market_name === anchor.market_name) continue;
            if (!allowedSpike(anchorType, spikeType)) continue;
            if (!isFiniteNumber(spike.over_price) || spike.over_price < MIN_SPIKE_ODDS) continue;

            const jump = calculateJump(anchor.line, spike.line);
            if (jump < minRequiredJump(spikeType)) continue;

            const score = calculateSpikeScore(anchor, spike);

            const candidate: PPPRow = {
              ...anchor,
              score,
              spike_market: spike.market_name,
              spike_line: spike.line,
              spike_odds: spike.over_price,
              spike_book: spike.bookmaker_title,
              bet: buildBet(spike),
              read: buildRead(anchor, spike),
              anchor_market_type: anchorType,
              spike_market_type: spikeType,
              tier: spikeTier(score),
            };

            const existing = bestSpikeByPlayer.get(anchor.player);

            if (!existing || (candidate.score ?? 0) > (existing.score ?? 0)) {
              bestSpikeByPlayer.set(anchor.player, candidate);
            }
          }
        }

        const strictRows = Array.from(bestSpikeByPlayer.values()).sort(
          (a, b) => (b.score ?? 0) - (a.score ?? 0)
        );

        setHeavyLegRows(heavyRows);
        setPppRows(strictRows);
        setPppCount(strictRows.length);

        setPppKeys(
          new Set(
            strictRows.map(
              (r) =>
                `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`
            )
          )
        );
      })
      .catch((err) => {
        console.error('PPP load failed:', err);
        setPppRows([]);
        setHeavyLegRows([]);
        setPppCount(0);
        setPppKeys(new Set());
      })
      .finally(() => setLoadingPPP(false));
  }, [showPPP, setPppKeys, setPppCount]);

  const uniqueGames = Array.from(
    new Set([
      ...pppRows.map((r) => r.game),
      ...heavyLegRows.map((r) => r.game),
    ])
  ).sort();

  const filteredRows =
    gameFilter === 'ALL'
      ? pppRows
      : pppRows.filter((r) => r.game === gameFilter);

  const filteredHeavyLegRows =
    gameFilter === 'ALL'
      ? heavyLegRows
      : heavyLegRows.filter((r) => r.game === gameFilter);

  const leftPlayers = new Set(filteredRows.map((r) => r.player));
  const rightPlayers = new Set(filteredHeavyLegRows.map((r) => r.player));
  const starredPlayers = new Set(
    Array.from(leftPlayers).filter((player) => rightPlayers.has(player))
  );

  return (
    <>
      <style jsx>{`
        .pppModalPanel {
          box-sizing: border-box;
        }

        .pppSplitGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .pppTableWrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
        }

        .pppLeftTable {
          min-width: 860px;
          width: max-content;
        }

        .pppRightTable {
          min-width: 560px;
          width: max-content;
        }

        .pppTableWrap :global(th),
        .pppTableWrap :global(td) {
          white-space: nowrap;
          vertical-align: middle;
        }

        .pppEmptyNote {
          margin-top: 10px;
          font-size: 13px;
          opacity: 0.75;
        }

        @media (max-width: 1200px) {
          .pppSplitGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .pppModalPanel {
            left: 12px !important;
            right: 12px !important;
            top: 12px !important;
            min-width: 0 !important;
            max-width: none !important;
            max-height: calc(100vh - 24px) !important;
            resize: none !important;
          }

          .pppSplitGrid {
            gap: 12px;
          }

          .pppLeftTable {
            min-width: 760px;
          }

          .pppRightTable {
            min-width: 520px;
          }
        }
      `}</style>

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

          <button
            type="button"
            className="pill"
            onClick={runManualRefresh}
            disabled={refreshing}
            title={refreshing ? 'Refreshing odds…' : 'Refresh odds now'}
            aria-label={refreshing ? 'Refreshing odds' : 'Refresh odds now'}
            style={{
              width: 40,
              minWidth: 40,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: refreshing ? 'wait' : 'pointer',
              opacity: refreshing ? 0.75 : 1,
            }}
          >
            {refreshing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 12a9 9 0 1 1-2.64-6.36"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 3v6h-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <animateTransform
                  attributeName="transform"
                  attributeType="XML"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="0.9s"
                  repeatCount="indefinite"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 12a9 9 0 1 1-2.64-6.36"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 3v6h-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
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
            className="panel pppModalPanel"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: position ? position.y : '10%',
              left: position ? position.x : '10%',
              minWidth: 720,
              minHeight: 320,
              maxWidth: '92vw',
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

              {!loadingPPP && pppRows.length === 0 && heavyLegRows.length === 0 && (
                <div>No spikes detected.</div>
              )}

              {!loadingPPP && (pppRows.length > 0 || heavyLegRows.length > 0) && (
                <>
                  <div
                    style={{
                      marginBottom: 10,
                      fontSize: 13,
                      opacity: 0.85,
                    }}
                  >
                    FanDuel only • anchor = UNDER -114/-118 • strict spike filter
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 14,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                      Filter Game:
                    </span>

                    <select
                      value={gameFilter}
                      onChange={(e) => setGameFilter(e.target.value)}
                      style={{
                        background: '#111827',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    >
                      <option value="ALL">All Games</option>
                      {uniqueGames.map((game) => (
                        <option key={game} value={game}>
                          {game}
                        </option>
                      ))}
                    </select>

                    <span style={{ fontSize: 12, opacity: 0.75 }}>
                      Showing {filteredRows.length} PPP picks • {filteredHeavyLegRows.length} OVER legs
                    </span>
                  </div>

                  <div className="pppSplitGrid">
                    <div style={{ minWidth: 0 }}>
                      {filteredRows.length > 0 ? (
                        <div className="pppTableWrap">
                          <table className="table pppLeftTable">
                            <thead>
                              <tr>
                                <th>Game</th>
                                <th>Player</th>
                                <th>Anchor</th>
                                <th>Spike</th>
                                <th>Odds</th>
                                <th>Tier</th>
                                <th>Score</th>
                                <th>BET</th>
                              </tr>
                            </thead>

                            <tbody>
                              {filteredRows.map((r, i) => {
                                const key =
                                  `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`;

                                return (
                                  <tr
                                    key={i}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => scrollToKey(key)}
                                    title="Click to scroll main table to the anchor row"
                                  >
                                    <td><GameLogos game={r.game} /></td>

                                    <td>{starredPlayers.has(r.player) ? `⭐ ${r.player}` : r.player}</td>

                                    <td>
                                      {r.market_name} {r.line} (U {r.under_price})
                                    </td>

                                    <td>
                                      {r.spike_market} {r.spike_line}
                                    </td>

                                    <td>
                                      +{r.spike_odds}
                                    </td>

                                    <td
                                      style={{
                                        fontWeight: 800,
                                        color: r.tier === 'NUKE' ? '#ff9f1c' : '#5eead4',
                                      }}
                                    >
                                      {r.tier}
                                    </td>

                                    <td style={{ fontWeight: 700 }}>
                                      {r.score}
                                    </td>

                                    <td
                                      style={{
                                        color: '#00ff9c',
                                        fontWeight: 800,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {r.bet}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="pppEmptyNote">No PPP picks for this game filter.</div>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      {filteredHeavyLegRows.length > 0 ? (
                        <div className="pppTableWrap">
                          <table className="table pppRightTable">
                            <thead>
                              <tr>
                                <th>Game</th>
                                <th>Player</th>
                                <th>Leg</th>
                                <th>Odds</th>
                                <th>Book</th>
                              </tr>
                            </thead>

                            <tbody>
                              {filteredHeavyLegRows.map((r, i) => {
                                const key =
                                  `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`;

                                return (
                                  <tr
                                    key={`${key}|${r.price}|${i}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => scrollToKey(key)}
                                    title="Click to scroll main table to this row"
                                  >
                                    <td><GameLogos game={r.game} /></td>

                                    <td>{starredPlayers.has(r.player) ? `⭐ ${r.player}` : r.player}</td>

                                    <td>
                                      {r.market_name} {r.line} (O)
                                    </td>

                                    <td>{r.price}</td>

                                    <td>{r.bookmaker_title}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="pppEmptyNote">No -600 / -1200 OVER legs.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
