'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import PPicon from '@/lib/PPicon.png';

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

  useEffect(() => {
    if (!showPPP) return;

    setLoadingPPP(true);
    fetch('/api/odds/latest')
      .then((r) => r.json())
      .then((data) => {
        const rows = (data.rows || []).filter(
          (r: any) => r.over_price === -114 && r.under_price === -114
        );
        setPppRows(rows);
      })
      .finally(() => setLoadingPPP(false));
  }, [showPPP]);

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
            }}
            onClick={() => setShowPPP(true)}
          >
            👑 PPP
          </button>

          <a
            className="pill"
            href="/api/odds/csv"
            target="_blank"
            rel="noreferrer"
          >
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowPPP(false)}
        >
          <div
            className="panel"
            style={{
              width: 'min(900px, 90vw)',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
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

            <div className="panelHeader">
              <div className="panelTitle">👑 PlayerParty Picks</div>
            </div>

            <div className="panelBody">
              {loadingPPP && <div>Loading…</div>}
              {!loadingPPP && pppRows.length === 0 && (
                <div>No PlayerPartyPicks found.</div>
              )}

              {!loadingPPP && pppRows.length > 0 && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Player</th>
                      <th>Market</th>
                      <th>Line</th>
                      <th>Book</th>
                      <th>Over</th>
                      <th>Under</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pppRows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.game}</td>
                        <td>{r.player}</td>
                        <td>{r.market_name}</td>
                        <td>{r.line}</td>
                        <td>{r.bookmaker_title}</td>
                        <td>{r.over_price}</td>
                        <td>{r.under_price}</td>
                      </tr>
                    ))}
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
