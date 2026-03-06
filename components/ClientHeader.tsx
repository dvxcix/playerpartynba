'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import PPicon from '@/lib/PPicon.png';
import { usePPP } from '@/components/PPPContext';

type PPPRow = {
  game: string;
  player: string;
  market_name: string;
  line: number;
  bookmaker_title: string;
  over_price: number;
  under_price: number;
};

type Pick = {
  game: string;
  player: string;
  market: string;
  line: number;
  odds: number;
};

export default function ClientHeader() {
  const [showPPP, setShowPPP] = useState(false);
  const [rows, setRows] = useState<PPPRow[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(false);

  const { setPppCount } = usePPP();

  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showPPP) return;

    setLoading(true);

    fetch('/api/odds/latest')
      .then((r) => r.json())
      .then((data) => {
        const all = data.rows || [];
        setRows(all);

        const modelPicks = buildModel(all);
        setPicks(modelPicks);

        setPppCount(modelPicks.length);
      })
      .finally(() => setLoading(false));
  }, [showPPP, setPppCount]);

  function buildModel(rows: PPPRow[]): Pick[] {
    const flaggedPlayers = new Set<string>();

    for (const r of rows) {
      if (r.over_price === -118 || r.over_price === -114 || r.over_price === -112) {
        flaggedPlayers.add(`${r.game}|${r.player}`);
      }
    }

    const picks: Pick[] = [];

    flaggedPlayers.forEach((key) => {
      const [game, player] = key.split('|');

      const playerRows = rows.filter(
        (r) => r.player === player && r.game === game
      );

      const ladder = playerRows
        .filter((r) => r.over_price >= 150 && r.over_price <= 400)
        .sort((a, b) => Math.abs(300 - a.over_price) - Math.abs(300 - b.over_price));

      if (ladder.length > 0) {
        const best = ladder[0];

        picks.push({
          game,
          player,
          market: best.market_name,
          line: best.line,
          odds: best.over_price,
        });
      }
    });

    return picks;
  }

  function confidence(odds: number) {
    if (odds >= 300) return '⭐⭐⭐⭐';
    if (odds >= 200) return '⭐⭐⭐';
    if (odds >= 150) return '⭐⭐';
    return '⭐';
  }

  function buildParlay(picks: Pick[]) {
    const legs = picks.slice(0, 4);

    let decimal = 1;

    legs.forEach((l) => {
      decimal *= l.odds / 100 + 1;
    });

    const american = Math.round((decimal - 1) * 100);

    return { legs, american };
  }

  const parlay = buildParlay(picks);

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image src={PPicon} alt="PPP" width={36} height={36} priority />
          <div>
            <div className="title">NBA Dashboard | PlayerParty</div>
            <div className="subtitle">Spike Detection Model</div>
          </div>
        </div>

        <button
          className="pill"
          onClick={() => setShowPPP(true)}
        >
          👑 PPP Picks ({picks.length})
        </button>
      </header>

      {showPPP && (
        <div className="modal">
          <div ref={modalRef} className="panel">
            <div className="panelHeader">
              <div className="panelTitle">👑 PlayerParty Picks</div>
              <button onClick={() => setShowPPP(false)}>✕</button>
            </div>

            <div className="panelBody">

              {loading && <div>Loading...</div>}

              {!loading && picks.length === 0 && (
                <div>No PlayerParty Picks</div>
              )}

              {!loading && picks.length > 0 && (
                <>
                  {picks.map((p, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <b>{p.game}</b> — {p.player} → {p.line}+ {p.market}
                      {' '}
                      ({p.odds})
                      {' '}
                      {confidence(p.odds)}
                    </div>
                  ))}

                  <hr style={{ margin: '16px 0' }} />

                  <div>
                    <b>🔥 Model Parlay</b>

                    {parlay.legs.map((l, i) => (
                      <div key={i}>
                        {l.player} {l.line}+ {l.market}
                      </div>
                    ))}

                    <div style={{ marginTop: 8 }}>
                      Estimated Odds: <b>+{parlay.american}</b>
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
