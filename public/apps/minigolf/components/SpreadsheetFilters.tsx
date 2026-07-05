"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserOption {
  id: string;
  email: string;
  name: string | null;
}

export default function SpreadsheetFilters({
  users,
  initialPlayer,
  initialDateFrom,
  initialDateTo,
  initialThreshold,
}: {
  users: UserOption[];
  initialPlayer: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialThreshold: string;
}) {
  const router = useRouter();
  const [player, setPlayer] = useState(initialPlayer);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [threshold, setThreshold] = useState(initialThreshold);

  function apply() {
    const params = new URLSearchParams();
    if (player) params.set("player", player);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (threshold) params.set("threshold", threshold);
    router.push(`/spreadsheet?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 p-3">
      <div>
        <label className="mb-1 block text-xs font-medium">Player</label>
        <select
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          className="rounded border border-black/20 px-2 py-1 text-sm"
        >
          <option value="">All players</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded border border-black/20 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded border border-black/20 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Highlight ≥</label>
        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-20 rounded border border-black/20 px-2 py-1 text-sm"
          placeholder="e.g. 5"
        />
      </div>
      <button
        onClick={apply}
        className="rounded bg-green-600 px-4 py-1.5 text-sm text-white"
      >
        Apply
      </button>
    </div>
  );
}
