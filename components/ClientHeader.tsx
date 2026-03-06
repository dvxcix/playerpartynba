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

/* ========================= */

type PPPRow = {
  game: string;
  player: string;
  market_name: string;
  line: number;
  bookmaker_title: string;
  over_price: number;
  under_price: number;
};

export default function ClientHeader() {

  const [showPPP, setShowPPP] = useState(false);
  const [pppRows, setPppRows] = useState<PPPRow[]>([]);
  const [loadingPPP, setLoadingPPP] = useState(false);

  const {
    setPppKeys,
    setPppCount,
    pppCount,
    scrollToKey
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
      y: e.clientY - rect.top
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {

    if (!showPPP) return;

    setLoadingPPP(true);

    fetch('/api/odds/latest')
      .then(r => r.json())
      .then(data => {

        const rows: PPPRow[] = data.rows || [];

        /* =========================
           STEP 1 — FIND ANCHORS
        ========================= */

        const anchors = rows.filter(r =>
          [-112, -113, -114, -118].includes(r.under_price)
        );

        /* =========================
           STEP 2 — SCAN PLAYER MARKETS
        ========================= */

        const spikes: PPPRow[] = [];

        anchors.forEach(anchor => {

          const playerRows = rows.filter(r =>
            r.player === anchor.player &&
            r.game === anchor.game
          );

          playerRows.forEach(r => {

            if (r.over_price >= 180 && r.over_price <= 1500) {
              spikes.push(r);
            }

          });

        });

        /* ========================= */

        setPppRows(spikes);

        setPppCount(spikes.length);

        setPppKeys(
          new Set(
            spikes.map(
              r =>
                `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`
            )
          )
        );

      })
      .finally(() => setLoadingPPP(false));

  }, [showPPP, setPppKeys, setPppCount]);

  return (
    <>
      <header className="header">

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          <Image src={PPicon} alt="PlayerParty" width={36} height={36} priority />

          <div>

            <div className="title">
              NBA Dashboard | PlayerParty (v A3.21)
            </div>

            <div className="subtitle">
              Check all odds for NBA games on Today, updated every 15min.
            </div>

          </div>

        </div>

        <div style={{ display: 'flex', gap: 10 }}>

          <button
            className="pill"
            style={{
              background: 'linear-gradient(135deg,#f5c542,#d4a017)',
              color: '#000',
              fontWeight: 700
            }}
            onClick={() => setShowPPP(true)}
          >
            👑 PPP {pppCount}
          </button>

          <a className="pill" href="/api/odds/csv">
            Export CSV
          </a>

        </div>

      </header>

      {showPPP && (

        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000
          }}
          onClick={() => setShowPPP(false)}
        >

          <div
            ref={modalRef}
            className="panel"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: position ? position.y : '10%',
              left: position ? position.x : '10%',
              width: 720,
              height: 520,
              resize: 'both',
              overflow: 'auto'
            }}
          >

            <div
              className="panelHeader"
              onMouseDown={onMouseDown}
              style={{ cursor: 'move' }}
            >
              👑 PlayerPartyPicks
            </div>

            <div className="panelBody">

              {loadingPPP && <div>Loading...</div>}

              {!loadingPPP && (

                <table className="table">

                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Player</th>
                      <th>Market</th>
                      <th>Line</th>
                      <th>Odds</th>
                    </tr>
                  </thead>

                  <tbody>

                    {pppRows.map((r, i) => {

                      const key = `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`;

                      return (

                        <tr
                          key={i}
                          style={{ cursor: 'pointer' }}
                          onClick={() => scrollToKey(key)}
                        >

                          <td>
                            <GameLogos game={r.game} />
                          </td>

                          <td>{r.player}</td>

                          <td>{r.market_name}</td>

                          <td>{r.line}</td>

                          <td>{r.over_price}</td>

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
