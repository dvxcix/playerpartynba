"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { columns, OddsRow } from "@/components/columns";
import { isTodayInUserTimezone } from "@/lib/time";

export default function Dashboard() {
  const [data, setData] = useState<OddsRow[]>([]);

  useEffect(() => {
    fetch("/api/odds/latest")
      .then(res => res.json())
      .then(res => {
        const todayOnly = res.rows.filter((r: OddsRow) =>
          isTodayInUserTimezone(r.commence_time)
        );
        setData(todayOnly);
      });
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        NBA Alternate Player Props (Today)
      </h1>

      <DataTable columns={columns} data={data} />
    </main>
  );
}
