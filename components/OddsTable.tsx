"use client";

import { useEffect, useMemo, useState } from "react";
import { isTodayInUserTimezone } from "@/lib/time";

type OddsRow = {
  game: string;
  player: string;
  market: string;
  bookmaker?: string;
  line: number;
  over: number;
  under: number;
  commence_time?: string;
};

export default function OddsTable() {
  const [rows, setRows] = useState<OddsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/odds/latest")
      .then(res => res.json())
      .then(data => {
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ✅ SAFE timezone filter (never nukes table)
  const todayRows = useMemo(() => {
    return rows.filter(row => {
      if (!row.commence_time) return true;
      return isTodayInUserTimezone(row.commence_time);
    });
  }, [rows]);

  if (loading) {
    return <div className="p-4">Loading odds…</div>;
  }

  if (!todayRows.length) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No odds available for today yet.
      </div>
    );
  }

  return (
    <div className="p-4 overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Game</th>
            <th className="border px-2 py-1">Player</th>
            <th className="border px-2 py-1">Market</th>
            <th className="border px-2 py-1">Line</th>
            <th className="border px-2 py-1">Over</th>
            <th className="border px-2 py-1">Under</th>
          </tr>
        </thead>
        <tbody>
          {todayRows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="border px-2 py-1">{row.game}</td>
              <td className="border px-2 py-1">{row.player}</td>
              <td className="border px-2 py-1">{row.market}</td>
              <td className="border px-2 py-1 text-right">{row.line}</td>
              <td className="border px-2 py-1 text-right">{row.over}</td>
              <td className="border px-2 py-1 text-right">{row.under}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
