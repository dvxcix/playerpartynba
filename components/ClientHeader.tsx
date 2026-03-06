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

type SpikeCandidate = {
  game: string;
  player: string;
  market_name: string;
  bookmaker_title: string;
  anchor_line: number;
  anchor_under_price: number;
  spike_line: number;
  spike_over_price: number;
  tier: 'SPIKE' | 'NUKE';
  key: string;
};

/* =========================
   MODEL HELPERS
   ========================= */

function marketBase(marketName: string) {
  const m = marketName.toLowerCase();

  if (m.includes('points') && !m.includes('+')) return 'points';
  if (m.includes('rebounds') && !m.includes('+')) return 'rebounds';
  if (m.includes('assists') && !m.includes('+')) return 'assists';
  if (m.includes('threes')) return 'threes';

  return 'other';
}

function isSupportedMarket(marketName: string) {
  const base = marketBase(marketName);
  return base === 'points' || base === 'rebounds' || base === 'assists' || base === 'threes';
}

/*
  User correction:
  the compression lives on the UNDER side
  examples: -112 / -113 / -114 / -118
*/
function isAnchorUnder(price: number) {
  return [-118, -114, -113, -112].includes(price);
}

function getSpikeCaps(base: string) {
  switch (base) {
    case 'points':
      return { minDiff: 4, maxDiff: 8, preferredDiff: 5.5, minOdds: 220, maxOdds: 1400 };
    case 'threes':
      return { minDiff: 1, maxDiff: 2, preferredDiff: 1.5, minOdds: 180, maxOdds: 1200 };
    case 'rebounds':
      return { minDiff: 2, maxDiff: 4, preferredDiff: 3, minOdds: 200, maxOdds: 1300 };
    case 'assists':
      return { minDiff: 1, maxDiff: 2, preferredDiff: 1.5, minOdds: 180, maxOdds: 1200 };
    default:
      return { minDiff: 1, maxDiff: 3, preferredDiff: 2, minOdds: 200, maxOdds: 1000 };
  }
}

function buildCandidateScore(base: string, anchorLine: number, spikeLine: number, spikeOver: number) {
  const caps = getSpikeCaps(base);
  const diff = spikeLine - anchorLine;

  if (diff < caps.minDiff || diff > caps.maxDiff) return -999999;
  if (spikeOver < caps.minOdds || spikeOver > caps.maxOdds) return -999999;

  const diffPenalty = Math.abs(diff - caps.preferredDiff) * 100;
  const oddsTarget = base === 'points' ? 450 : base === 'threes' ? 350 : base === 'rebounds' ? 420 : 320;
  const oddsPenalty = Math.abs(spikeOver - oddsTarget) * 0.15;

  return 1000 - diffPenalty - oddsPenalty;
}

function dedupeCandidates(candidates: SpikeCandidate[]) {
  const seen = new Map<string, SpikeCandidate>();

  for (const c of candidates) {
    const dedupeKey = `${c.game}|${c.player}|${c.market_name}|${c.bookmaker_title}|${c.spike_line}`;
    const existing = seen.get(dedupeKey);

    if (!existing || c.spike_over_price < existing.spike_over_price) {
      seen.set(dedupeKey, c);
    }
  }

  return Array.from(seen.values());
}

function buildSpikeCandidates(rows: OddsRow[]) {
  /*
    Keep this tight so PPP is usable:
    - FanDuel only
    - supported markets only
    - anchor found by compressed UNDER
    - return best 1-2 spikes per anchor, not every possible row
  */
  const fdRows = rows.filter(
    (r) =>
      r.bookmaker_title === 'FanDuel' &&
      isSupportedMarket(r.market_name) &&
      typeof r.line === 'number' &&
      typeof r.under_price === 'number' &&
      typeof r.over_price === 'number'
  );

  const anchors = fdRows.filter((r) => isAnchorUnder(r.under_price));

  const candidates: SpikeCandidate[] = [];

  for (const anchor of anchors) {
    const base = marketBase(anchor.market_name);

    const matchingSpikes = fdRows
      .filter(
        (r) =>
          r.game === anchor.game &&
          r.player === anchor.player &&
          r.market_name === anchor.market_name &&
          r.bookmaker_title === anchor.bookmaker_title &&
          r.line > anchor.line
      )
      .map((r) => ({
        row: r,
        score: buildCandidateScore(base, anchor.line, r.line, r.over_price),
      }))
      .filter((x) => x.score > -999999)
      .sort((a, b) => b.score - a.score);

    /*
      Best 2 max per anchor:
      one main spike, one optional nuke if still reasonable
    */
    const top = matchingSpikes.slice(0, 2);

    top.forEach((x, index) => {
      candidates.push({
        game: anchor.game,
        player: anchor.player,
        market_name: anchor.market_name,
        bookmaker_title: anchor.bookmaker_title,
        anchor_line: anchor.line,
        anchor_under_price: anchor.under_price,
        spike_line: x.row.line,
        spike_over_price: x.row.over_price,
        tier: index === 0 ? 'SPIKE' : 'NUKE',
        key: `${x.row.game}|${x.row.player}|${x.row.market_name}|${x.row.line}|${x.row.bookmaker_title}`,
      });
    });
  }

  return dedupeCandidates(candidates).sort((a, b) => {
    if (a.game !== b.game) return a.game.localeCompare(b.game);
    if (a.player !== b.player) return a.player.localeCompare(b.player);
    if (a.market_name !== b.market_name) return a.market_name.localeCompare(b.market_name);
    return a.spike_line - b.spike_line;
  });
}

/* =========================
   COMPONENT
   ========================= */

export default function ClientHeader() {
  const [showPPP, setShowPPP] = useState(false);
  const [pppRows, setPppRows] = useState<SpikeCandidate[]>([]);
  const [loadingPPP, setLoadingPPP] = useState(false);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'SPIKE' | 'NUKE'>('ALL');

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
        const allRows: OddsRow[] = data.rows || [];
        const spikes = buildSpikeCandidates(allRows);

        setPppRows(spikes);
        setPppCount(spikes.length);
        setPppKeys(new Set(spikes.map((r) => r.key)));
      })
      .finally(() => setLoadingPPP(false));
  }, [showPPP, setPppCount, setPppKeys]);

  const filteredRows = useMemo(() => {
    if (tierFilter === 'ALL') return pppRows;
    return pppRows.filter((r) => r.tier === tierFilter);
  }, [pppRows, tierFilter]);

  const copyText = useMemo(() => {
    return filteredRows
      .map(
        (r) =>
          `${r.game} | ${r.player} | ${r.market_name} | anchor ${r.anchor_line} (U ${r.anchor_under_price}) -> spike ${r.spike_line} (O +${r.spike_over_price}) | ${r.tier}`
      )
      .join('\n');
  }, [filteredRows]);

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
              width: 'min(1120px, 92vw)',
              height: 'min(760px, 84vh)',
              minWidth: 760,
              minHeight: 420,
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
                    <button
                      className="pill"
                      onClick={() => navigator.clipboard.writeText(copyText)}
                      type="button"
                    >
                      📋 Copy
                    </button>

                    <button className="pill" onClick={() => setTierFilter('ALL')} type="button">
                      All ({pppRows.length})
                    </button>

                    <button
                      className="pill"
                      onClick={() => setTierFilter('SPIKE')}
                      type="button"
                    >
                      Spike ({pppRows.filter((r) => r.tier === 'SPIKE').length})
                    </button>

                    <button className="pill" onClick={() => setTierFilter('NUKE')} type="button">
                      Nuke ({pppRows.filter((r) => r.tier === 'NUKE').length})
                    </button>

                    <div style={{ marginLeft: 'auto', opacity: 0.8, fontSize: 12 }}>
                      FanDuel only • anchor = UNDER -112/-113/-114/-118
                    </div>
                  </div>

                  {!loadingPPP && filteredRows.length === 0 && <div>No spike candidates found.</div>}

                  {!loadingPPP && filteredRows.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ minWidth: 980 }}>
                        <thead>
                          <tr>
                            <th>Game</th>
                            <th>Player</th>
                            <th>Market</th>
                            <th>Anchor</th>
                            <th>Spike</th>
                            <th>Odds</th>
                            <th>Tier</th>
                            <th>Book</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((r, i) => (
                            <tr
                              key={`${r.key}-${i}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => scrollToKey(r.key)}
                              title="Click to scroll main table to this spike row"
                            >
                              <td>
                                <GameLogos game={r.game} />
                              </td>
                              <td>{r.player}</td>
                              <td>{r.market_name}</td>
                              <td>
                                {r.anchor_line}
                                <span style={{ opacity: 0.65 }}> (U {r.anchor_under_price})</span>
                              </td>
                              <td>{r.spike_line}</td>
                              <td>O +{r.spike_over_price}</td>
                              <td>{r.tier}</td>
                              <td>{r.bookmaker_title}</td>
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
