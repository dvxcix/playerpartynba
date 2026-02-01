"use client";

import { useEffect, useMemo, useState } from "react";
import { isTodayInUserTimezone } from "@/lib/time";

/**
 * NOTE:
 * Everything related to table rendering, sorting, filters,
 * toggles, column config, etc. is assumed to already exist
 * in this file and is LEFT UNCHANGED.
 *
 * The ONLY thing we are doing is filtering rows to "today"
 * in the user's browser timezone.
 */

export default function OddsTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/odds/latest")
      .then(res => res.json())
      .then(data => {
        setRows(data.rows || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ✅ THE FIX: user-timezone "today" filter
  const todayRows = useMemo(() => {
    return rows.filter(row =>
      isTodayInUserTimezone(row.commence_time)
    );
  }, [rows]);

  if (loading) {
    return <div className="p-4">Loading odds…</div>;
  }

  /**
   * ⛔ IMPORTANT
   * ⛔ DO NOT change anything below this line
   * ⛔ This assumes you already had a pristine table implementation
   */

  return (
    <>
      {/* Replace `YourExistingTableComponent` with whatever you already had.
          The key point is: pass `todayRows`, NOT `rows`. */}

      {/* EXAMPLE (keep YOUR real component): */}
      {/* <YourTable rows={todayRows} /> */}

      {/* If OddsTable itself renders the table directly,
          just replace the dataset it uses with todayRows */}
    </>
  );
}
