'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import PPicon from '@/lib/PPicon.png';
import { usePPP } from '@/components/PPPContext';

/* (team logos + GameLogos unchanged, omitted here for brevity — keep yours exactly) */

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

  const { setPppKeys, setPppCount, scrollToKey } = usePPP();

  useEffect(() => {
    if (!showPPP) return;

    setLoadingPPP(true);
    fetch('/api/odds/latest')
      .then((r) => r.json())
      .then((data) => {
        const rows = (data.rows || [])
          .filter(
            (r: any) => r.over_price === -114 && r.under_price === -114
          )
          .sort((a: any, b: any) => a.game.localeCompare(b.game));

        setPppRows(rows);
        setPppCount(rows.length);

        setPppKeys(
          new Set(
            rows.map(
              (r: any) =>
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
          <Image src={PPicon} alt="PlayerParty" width={36} height={36} />
          <div>
            <div className="title">NBA Dashboard | PlayerParty (v A3.21)</div>
            <div className="subtitle">
              Check all odds for NBA games on Today, updated every 15min.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="pill" onClick={() => setShowPPP(true)}>
            👑 PPP {pppRows.length > 0 && `(${pppRows.length})`}
          </button>

          <a className="pill" href="/api/odds/csv" target="_blank">
            Export CSV
          </a>
        </div>
      </header>

      {showPPP && (
        /* MODAL UNCHANGED EXCEPT ROW CLICK */
        <table className="table">
          <tbody>
            {pppRows.map((r, i) => {
              const key = `${r.game}|${r.player}|${r.market_name}|${r.line}|${r.bookmaker_title}`;
              return (
                <tr
                  key={i}
                  style={{ cursor: 'pointer' }}
                  onClick={() => scrollToKey(key)}
                >
                  <td>{r.game}</td>
                  <td>{r.player}</td>
                  <td>{r.market_name}</td>
                  <td>{r.line}</td>
                  <td>{r.bookmaker_title}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
