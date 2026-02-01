"use client";

import { useEffect, useState } from "react";
import { isTodayInUserTimezone } from "@/lib/time";

export default function Dashboard() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/odds/latest")
      .then(res => res.json())
      .then(data => {
        const filtered = data.rows.filter((r: any) =>
          isTodayInUserTimezone(r.commence_time)
        );
        setRows(filtered);
      });
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">NBA Alternate Player Props</h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th>Game</th>
            <th>Player</th>
            <th>Market</th>
            <th>Line</th>
            <th>Over</th>
            <th>Under</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.game}</td>
              <td>{r.player}</td>
              <td>{r.market}</td>
              <td>{r.line}</td>
              <td>{r.over}</td>
              <td>{r.under}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
