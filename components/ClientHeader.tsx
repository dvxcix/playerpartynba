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
  over_price: number;
  under_price: number;
};

type AnchorRow = OddsRow & {
  anchorType: 'UNDER_COMPRESSION';
};

type PPPCandidate = {
  game: string;
  player: string;
  bookmaker_title: string;

  anchor_market: string;
  anchor_line: number;
  anchor_under_price: number;

  spike_market: string;
  spike_line: number;
  spike_over_price: number;

  score: number;
  tier: 'SPIKE' | 'NUKE';
  reason: string;

  scrollKey: string;
};

/* =========================
   MODEL SETTINGS
   ========================= */

const UNDER_ANCHORS = new Set([-112, -113, -114, -118]);
const SUPPORTED_MARKETS = ['Alt Points', 'Alt Rebounds', 'Alt Assists', 'Alt Threes'];
const ALLOWED_BOOK = 'FanDuel';

function isSupportedMarket(market: string) {
  return SUPPORTED_MARKETS.includes(market);
}

function isAnchorRow(row: OddsRow) {
  return (
    row.bookmaker_title === ALLOWED_BOOK &&
    isSupportedMarket(row.market_name) &&
    UNDER_ANCHORS.has(row.under_price)
  );
}

function baseMarket(market: string) {
  const lower = market.toLowerCase();
  if (lower.includes('points')) return 'points';
  if (lower.includes('rebounds')) return 'rebounds';
  if (lower.includes('assists')) return 'assists';
  if (lower.includes('threes')) return 'threes';
  return 'other';
}

function getSpikeRules(market: string) {
  const base = baseMarket(market);

  switch (base) {
    case 'points':
      return {
        minDiff: 3,
        maxDiff: 8,
        preferredDiff: 5,
        minOdds: 180,
        maxOdds: 1500,
      };
    case 'rebounds':
      return {
        minDiff: 2,
        maxDiff: 5,
        preferredDiff: 3,
        minOdds: 180,
        maxOdds: 1500,
      };
    case 'assists':
      return {
        minDiff: 1,
        maxDiff: 3,
        preferredDiff: 2,
        minOdds: 170,
        maxOdds: 1300,
      };
    case 'threes':
      return {
        minDiff: 1,
        maxDiff: 2,
        preferredDiff: 1,
        minOdds: 170,
        maxOdds: 1300,
      };
    default:
      return {
        minDiff: 1,
        maxDiff: 99,
        preferredDiff: 1,
        minOdds: 150,
        maxOdds: 1500,
      };
  }
}

/*
  Cross-market translation.
  This is the part you asked for:
  anchor can be in one market, spike can be in another.
*/
function crossMarketBoost(anchorMarket: string, spikeMarket: string) {
  const a = baseMarket(anchorMarket);
  const s = baseMarket(spikeMarket);

  if (a === s) return 1.0;

  const key = `${a}->${s}`;

  switch (key) {
    case 'points->threes':
      return 1.18;
    case 'points->assists':
      return 1.08;
    case 'points->rebounds':
      return 1.02;

    case 'assists->points':
      return 1.12;
    case 'assists->threes':
      return 1.02;
    case 'assists->rebounds':
      return 0.92;

    case 'rebounds->points':
      return 1.06;
    case 'rebounds->threes':
      return 0.95;
    case 'rebounds->assists':
      return 0.94;

    case 'threes->points':
      return 1.20;
    case 'threes->assists':
      return 0.92;
    case 'threes->rebounds':
      return 0.88;

    default:
      return 1.0;
  }
}

function sameMarketTightnessBoost(anchorMarket: string, spikeMarket: string, diff: number) {
  if (anchorMarket !== spikeMarket) return 1.0;

  const base = baseMarket(anchorMarket);

  if (base === 'assists' && diff > 2) return 0.65;
  if (base === 'threes' && diff > 1.5) return 0.72;
  if (base === 'rebounds' && diff > 4) return 0.82;
  if (base === 'points' && diff > 7) return 0.88;

  return 1.0;
}

function oddsTargetForMarket(market: string) {
  const base = baseMarket(market);
  switch (base) {
    case 'points':
      return 320;
    case 'rebounds':
      return 300;
    case 'assists':
      return 260;
    case 'threes':
      return 240;
    default:
      return 250;
  }
}

function scoreCandidate(anchor: AnchorRow, spike: OddsRow) {
  if (spike.bookmaker_title !== ALLOWED_BOOK) return -999999;
  if (!isSupportedMarket(spike.market_name)) return -999999;
  if (spike.player !== anchor.player || spike.game !== anchor.game) return -999999;
  if (spike.over_price < 170 || spike.over_price > 1500) return -999999;

  const rules = getSpikeRules(spike.market_name);
  const diff = spike.line - anchor.line;

  if (diff < rules.minDiff || diff > rules.maxDiff) return -999999;
  if (spike.over_price < rules.minOdds || spike.over_price > rules.maxOdds) return -999999;

  const diffPenalty = Math.abs(diff - rules.preferredDiff) * 85;
  const oddsPenalty = Math.abs(spike.over_price - oddsTargetForMarket(spike.market_name)) * 0.28;

  const crossBoost = crossMarketBoost(anchor.market_name, spike.market_name);
  const sameTightness = sameMarketTightnessBoost(anchor.market_name, spike.market_name, diff);

  const score = (1000 - diffPenalty - oddsPenalty) * crossBoost * sameTightness;
  return Number(score.toFixed(2));
}

function buildReason(anchor: AnchorRow, spike: OddsRow) {
  const a = baseMarket(anchor.market_name);
  const s = baseMarket(spike.market_name);
  if (a === s) return `${a} anchor → ${s} spike`;
  return `${a} anchor → sneaky ${s} spike`;
}

function dedupeBestCandidates(candidates: PPPCandidate[]) {
  const bestByPair = new Map<string, PPPCandidate>();

  for (const c of candidates) {
    const key = `${c.game}|${c.player}|${c.anchor_market}|${c.spike_market}|${c.spike_line}`;
    const existing = bestByPair.get(key);
    if (!existing || c.score > existing.score) {
      bestByPair.set(key, c);
    }
  }

  return Array.from(bestByPair.values());
}

function buildCandidates(rows: OddsRow[]) {
  const anchors: AnchorRow[] = rows
    .filter(isAnchorRow)
    .map((r) => ({ ...r, anchorType: 'UNDER_COMPRESSION' as const }));

  const candidates: PPPCandidate[] = [];

  for (const anchor of anchors) {
    const playerRows = rows.filter(
      (r) =>
        r.bookmaker_title === ALLOWED_BOOK &&
        r.game === anchor.game &&
        r.player === anchor.player &&
        isSupportedMarket(r.market_name)
    );

    for (const spike of playerRows) {
      const score = scoreCandidate(anchor, spike);
      if (score <= 0) continue;

      candidates.push({
        game: anchor.game,
        player: anchor.player,
        bookmaker_title: spike.bookmaker_title,

        anchor_market: anchor.market_name,
        anchor_line: anchor.line,
        anchor_under_price: anchor.under_price,

        spike_market: spike.market_name,
        spike_line: spike.line,
        spike_over_price: spike.over_price,

        score,
        tier: score >= 900 ? 'NUKE' : 'SPIKE',
        reason: buildReason(anchor, spike),

        scrollKey: `${spike.game}|${spike.player}|${spike.market_name}|${spike.line}|${spike.bookmaker_title}`,
      });
    }
  }

  const deduped = dedupeBestCandidates(candidates);

  /*
    Keep PPP tight:
    - best 1 candidate per player
    - but still preserve the strongest overall board
  */
  const bestByPlayer = new Map<string, PPPCandidate>();

  for (const c of deduped.sort((a, b) => b.score - a.score)) {
    const key = `${c.game}|${c.player}`;
    if (!bestByPlayer.has(key)) {
      bestByPlayer.set(key, c);
    }
  }

  return Array.from(bestByPlayer.values()).sort((a, b) => b.score - a.score);
}

/* =========================
   COMPONENT
   ========================= */

export default function ClientHeader() {
  const [showPPP, setShowPPP] = useState(false);
  const [pppRows, setPppRows] = useState<PPPCandidate[]>([]);
  const [loadingPPP, setLoadingPPP] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'SPIKE' | 'NUKE'>('ALL');

  const { setPppKeys, pppCount, setPppCount, scrollToKey } = usePPP();

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
        const rows: OddsRow[] = data.rows || [];
        const candidates = buildCandidates(rows);

        setPppRows(candidates);
        setPppCount(candidates.length);
        setPppKeys(new Set(candidates.map((r) => r.scrollKey)));
      })
      .finally(() => setLoadingPPP(false));
  }, [showPPP, setPppCount, setPppKeys]);

  const visibleRows = useMemo(() => {
    if (filter === 'ALL') return pppRows;
    return pppRows.filter((r) => r.tier === filter);
  }, [pppRows, filter]);

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Image src={PPicon} alt="PlayerParty" width={36} height={36} priority />
          <div>
            <div className="title">NBA Dashboard | PlayerParty (v A3.21)</div>
            <div className="subtitle">Check all odds for NBA games on Today, updated every 15min.</div>
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
              top: position ? position.y : 70,
              left: position ? position.x : 70,
              width: 'min(1180px, 92vw)',
              height: 'min(760px, 84vh)',
              minWidth: 860,
              minHeight: 440,
              maxWidth: '92vw',
              maxHeight: '84vh',
              resize: 'both',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              className="panelHeader"
              style={{
                cursor: 'move',
                userSelect: 'none',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
              onMouseDown={onMouseDown}
            >
              <div className="panelTitle">👑 PlayerPartyPicks</div>

              <button
                onClick={() => setShowPPP(false)}
                style={{
                  fontSize: 18,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Close PPP"
              >
                ✕
              </button>
            </div>

            <div
              className="panelBody"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                paddingBottom: 8,
              }}
            >
              {loadingPPP && <div>Loading…</div>}

              {!loadingPPP && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 10,
                      alignItems: 'center',
                    }}
                  >
                    <button className="pill" onClick={() => setFilter('ALL')} type="button">
                      All ({pppRows.length})
                    </button>

                    <button className="pill" onClick={() => setFilter('SPIKE')} type="button">
                      Spike ({pppRows.filter((r) => r.tier === 'SPIKE').length})
                    </button>

                    <button className="pill" onClick={() => setFilter('NUKE')} type="button">
                      Nuke ({pppRows.filter((r) => r.tier === 'NUKE').length})
                    </button>

                    <div style={{ marginLeft: 'auto', opacity: 0.8, fontSize: 12 }}>
                      FanDuel only • anchor = UNDER -112/-113/-114/-118 • cross-market enabled
                    </div>
                  </div>

                  {visibleRows.length === 0 && <div>No PPP candidates found.</div>}

                  {visibleRows.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ minWidth: 1120 }}>
                        <thead>
                          <tr>
                            <th>Game</th>
                            <th>Player</th>
                            <th>Anchor</th>
                            <th>Spike</th>
                            <th>Odds</th>
                            <th>Tier</th>
                            <th>Score</th>
                            <th>Read</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRows.map((r, i) => (
                            <tr
                              key={`${r.scrollKey}-${i}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => scrollToKey(r.scrollKey)}
                              title="Click to scroll main table to this spike row"
                            >
                              <td>
                                <GameLogos game={r.game} />
                              </td>
                              <td>{r.player}</td>
                              <td>
                                {r.anchor_market} {r.anchor_line}
                                <span style={{ opacity: 0.65 }}> (U {r.anchor_under_price})</span>
                              </td>
                              <td>
                                {r.spike_market} {r.spike_line}
                              </td>
                              <td>O {r.spike_over_price > 0 ? `+${r.spike_over_price}` : r.spike_over_price}</td>
                              <td>{r.tier}</td>
                              <td>{Math.round(r.score)}</td>
                              <td>{r.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
    }
