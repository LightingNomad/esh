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
  availableYears,
  initialPlayer,
  initialDateFrom,
  initialDateTo,
  initialThreshold,
  initialSort,
}: {
  users: UserOption[];
  availableYears: string[];
  initialPlayer: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialThreshold: string;
  initialSort: "asc" | "desc";
}) {
  const router = useRouter();
  const [player, setPlayer] = useState(initialPlayer);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [sort, setSort] = useState(initialSort);

  function apply(overrides?: { dateFrom?: string; dateTo?: string; sort?: "asc" | "desc" }) {
    const nextDateFrom = overrides?.dateFrom ?? dateFrom;
    const nextDateTo = overrides?.dateTo ?? dateTo;
    const nextSort = overrides?.sort ?? sort;

    const params = new URLSearchParams();
    if (player) params.set("player", player);
    if (nextDateFrom) params.set("dateFrom", nextDateFrom);
    if (nextDateTo) params.set("dateTo", nextDateTo);
    if (threshold) params.set("threshold", threshold);
    if (nextSort !== "desc") params.set("sort", nextSort);
    router.push(`/spreadsheet?${params.toString()}`);
  }

  function selectYear(year: string) {
    const yearFrom = `${year}-01-01`;
    const yearTo = `${year}-12-31`;
    const isActive = dateFrom === yearFrom && dateTo === yearTo;
    const nextFrom = isActive ? "" : yearFrom;
    const nextTo = isActive ? "" : yearTo;
    setDateFrom(nextFrom);
    setDateTo(nextTo);
    apply({ dateFrom: nextFrom, dateTo: nextTo });
  }

  function toggleSort() {
    const next = sort === "desc" ? "asc" : "desc";
    setSort(next);
    apply({ sort: next });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-3">
      {availableYears.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium">Year</span>
          {availableYears.map((year) => {
            const yearFrom = `${year}-01-01`;
            const yearTo = `${year}-12-31`;
            const isActive = dateFrom === yearFrom && dateTo === yearTo;
            return (
              <button
                key={year}
                onClick={() => selectYear(year)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  isActive
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-black/20 hover:bg-black/5"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
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
        <div>
          <label className="mb-1 block text-xs font-medium">Sort</label>
          <button
            onClick={toggleSort}
            className="rounded border border-black/20 px-2 py-1 text-sm hover:bg-black/5"
          >
            {sort === "desc" ? "Newest first ↓" : "Oldest first ↑"}
          </button>
        </div>
        <button
          onClick={() => apply()}
          className="rounded bg-green-600 px-4 py-1.5 text-sm text-white"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
