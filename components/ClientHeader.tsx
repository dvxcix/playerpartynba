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
  PHI, MIL, CHI, CLE, BOS, MEM, ATL, MIA, CHA, UTA, SAC, NYK, LAL, ORL,
  DAL, BKN, DEN, IND, NOP, DET, TOR, HOU, SAS, PHX, OKC, MIN, POR, GSW, WAS,
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
};

/* =========================
SPIKE ENGINE
========================= */

const ANCHOR_PRICES = [-112, -113, -114, -118];

function isAnchor(r: PPPRow) {
  return ANCHOR_PRICES.includes(r.under_price);
}

function getMarketType(m: string) {
  if (m.includes('Points')) return 'PTS';
  if (m.includes('Rebounds')) return 'REB';
  if (m.includes('Assists')) return 'AST';
  if (m.includes('Threes')) return '3PM';
  return '';
}

function allowedSpike(anchor: string, spike: string) {

  if (anchor === 'PTS')
    return spike === 'REB' || spike === 'AST' || spike === '3PM';

  if (anchor === 'REB')
    return spike === 'PTS' || spike === 'AST';

  if (anchor === 'AST')
    return spike === 'PTS' || spike === '3PM';

  if (anchor === '3PM')
    return spike === 'PTS';

  return false;
}

function calculateSpikeScore(anchor: PPPRow, spike: PPPRow) {

  let score = 1000;

  const price = spike.over_price;

  if (price >= 150) score += 20;
  if (price >= 200) score += 40;
  if (price >= 300) score += 60;
  if (price >= 500) score += 90;

  if (spike.market_name.includes('Threes')) score += 20;

  return score;
}

/* =========================
HEADER
========================= */

export default function ClientHeader() {

  const [showPPP, setShowPPP] = useState(false);
  const [pppRows, setPppRows] = useState<PPPRow[]>([]);
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

  /* =========================
  FETCH + SPIKE ENGINE
  ========================= */

  useEffect(() => {

    if (!showPPP) return;

    setLoadingPPP(true);

    fetch('/api/odds/latest')
      .then((r) => r.json())
      .then((data) => {

        const rows: PPPRow[] = data.rows || [];

        const anchors = rows.filter(isAnchor);

        const spikes: PPPRow[] = [];

        for (const anchor of anchors) {

          const anchorType = getMarketType(anchor.market_name);

          const candidates = rows.filter(
            r =>
              r.player === anchor.player &&
              allowedSpike(anchorType, getMarketType(r.market_name)) &&
              r.over_price >= 120
          );

          for (const spike of candidates) {

            const score = calculateSpikeScore(anchor, spike);

            spikes.push({
              ...anchor,
              score,
              spike_market: spike.market_name,
              spike_line: spike.line,
              spike_odds: spike.over_price,
            });

          }

        }

        spikes.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        setPppRows(spikes);

        setPppCount(spikes.length);

        setPppKeys(
          new Set(
            spikes.map(
              (r) =>
                `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`
            )
          )
        );

      })
      .finally(() => setLoadingPPP(false));

  }, [showPPP, setPppKeys, setPppCount]);

  /* ========================= */

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
              minWidth: 520,
              minHeight: 320,
              maxWidth: '90vw',
              maxHeight: '85vh',
              resize: 'both',
              overflow: 'auto',
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
                <div>No spikes detected.</div>
              )}

              {!loadingPPP && pppRows.length > 0 && (
                <table className="table">

                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Player</th>
                      <th>Anchor</th>
                      <th>Spike</th>
                      <th>Odds</th>
                      <th>Score</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pppRows.map((r, i) => {

                      const key =
                        `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`;

                      return (
                        <tr
                          key={i}
                          style={{ cursor: 'pointer' }}
                          onClick={() => scrollToKey(key)}
                        >

                          <td><GameLogos game={r.game} /></td>

                          <td>{r.player}</td>

                          <td>
                            {r.market_name} {r.line}
                          </td>

                          <td>
                            {r.spike_market} {r.spike_line}
                          </td>

                          <td>
                            +{r.spike_odds}
                          </td>

                          <td>{r.score}</td>

                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
