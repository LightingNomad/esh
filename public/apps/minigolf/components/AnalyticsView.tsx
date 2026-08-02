"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BASE_PATH } from "@/lib/basePath";
import type { Hole } from "@/lib/types";

interface UserOption {
  id: string;
  email: string;
  name: string | null;
  is_guest: number;
}

interface PlayerScore {
  round_id: string;
  hole_number: number;
  stroke_count: number | null;
  date_played: string;
}

interface HoleRecord {
  userId: string;
  roundId: string;
  datePlayed: string;
  strokeCount: number;
}

interface RoundTotal {
  roundId: string;
  userId: string;
  datePlayed: string;
  total: number;
}

function label(u: UserOption) {
  return (u.name || u.email) + (u.is_guest ? " (guest)" : "");
}

export default function AnalyticsView({
  users,
  courseId,
  holes,
}: {
  users: UserOption[];
  courseId: string | null;
  holes: Hole[];
}) {
  const [playerId, setPlayerId] = useState(users[0]?.id ?? "");
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [holeNumber, setHoleNumber] = useState(1);
  const [holeRecords, setHoleRecords] = useState<HoleRecord[]>([]);
  const [totalsScope, setTotalsScope] = useState<"all" | "player">("all");
  const [totalsSort, setTotalsSort] = useState<"asc" | "desc">("asc");
  const [roundTotals, setRoundTotals] = useState<RoundTotal[]>([]);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const holeByNumber = useMemo(
    () => new Map(holes.map((h) => [h.hole_number, h])),
    [holes]
  );

  useEffect(() => {
    if (!playerId) return;
    fetch(`${BASE_PATH}/api/players/${playerId}/scores`)
      .then((res) => res.json())
      .then((data) => setScores((data as { scores: PlayerScore[] }).scores));
  }, [playerId]);

  useEffect(() => {
    if (!courseId) return;
    fetch(`${BASE_PATH}/api/courses/${courseId}/hole-records?hole=${holeNumber}`)
      .then((res) => res.json())
      .then((data) => setHoleRecords((data as { records: HoleRecord[] }).records));
  }, [courseId, holeNumber]);

  useEffect(() => {
    if (!courseId) return;
    const params = new URLSearchParams({ sort: totalsSort });
    if (totalsScope === "player" && playerId) params.set("player", playerId);
    fetch(`${BASE_PATH}/api/courses/${courseId}/round-totals?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setRoundTotals((data as { totals: RoundTotal[] }).totals));
  }, [courseId, totalsScope, totalsSort, playerId]);

  const scoredHoles = useMemo(() => scores.filter((s) => s.stroke_count != null), [scores]);

  const bestScore = holeRecords[0]?.strokeCount;
  const bestEntries = useMemo(
    () => (bestScore == null ? [] : holeRecords.filter((r) => r.strokeCount === bestScore)),
    [holeRecords, bestScore]
  );
  const aceEntries = useMemo(() => holeRecords.filter((r) => r.strokeCount === 1), [holeRecords]);
  const selectedHole = holeByNumber.get(holeNumber);

  function playerLabel(userId: string) {
    const u = userById.get(userId);
    return u ? label(u) : userId;
  }

  const totalsOverTime = useMemo(() => {
    const byRound = new Map<string, { date: string; total: number }>();
    for (const s of scoredHoles) {
      const existing = byRound.get(s.round_id) ?? { date: s.date_played, total: 0 };
      existing.total += s.stroke_count ?? 0;
      byRound.set(s.round_id, existing);
    }
    return Array.from(byRound.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [scoredHoles]);

  const holeNumbers = useMemo(
    () => Array.from(new Set(scoredHoles.map((s) => s.hole_number))).sort((a, b) => a - b),
    [scoredHoles]
  );

  const holeTrend = useMemo(
    () =>
      scoredHoles
        .filter((s) => s.hole_number === holeNumber)
        .map((s) => ({ date: s.date_played, strokes: s.stroke_count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [scoredHoles, holeNumber]
  );

  return (
    <div className="space-y-8">
      <div>
        <label className="mb-1 block text-sm font-medium">Player</label>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          className="rounded border border-black/20 px-3 py-2"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {label(u)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Best &amp; worst rounds</h2>
          <div className="flex gap-2">
            <div className="flex overflow-hidden rounded border border-black/20 text-sm">
              <button
                type="button"
                onClick={() => setTotalsScope("all")}
                className={`px-2 py-1 ${
                  totalsScope === "all" ? "bg-black/10 font-medium" : ""
                }`}
              >
                All players
              </button>
              <button
                type="button"
                onClick={() => setTotalsScope("player")}
                className={`px-2 py-1 ${
                  totalsScope === "player" ? "bg-black/10 font-medium" : ""
                }`}
              >
                Selected player
              </button>
            </div>
            <div className="flex overflow-hidden rounded border border-black/20 text-sm">
              <button
                type="button"
                onClick={() => setTotalsSort("asc")}
                className={`px-2 py-1 ${
                  totalsSort === "asc" ? "bg-black/10 font-medium" : ""
                }`}
              >
                Lowest first
              </button>
              <button
                type="button"
                onClick={() => setTotalsSort("desc")}
                className={`px-2 py-1 ${
                  totalsSort === "desc" ? "bg-black/10 font-medium" : ""
                }`}
              >
                Highest first
              </button>
            </div>
          </div>
        </div>
        {!courseId ? (
          <p className="text-sm text-black/60">No course set up yet.</p>
        ) : roundTotals.length === 0 ? (
          <p className="text-sm text-black/60">
            No complete rounds recorded yet{totalsScope === "player" ? " for this player" : ""}.
          </p>
        ) : (
          <ol className="divide-y divide-black/10 rounded border border-black/10">
            {roundTotals.slice(0, 10).map((r, i) => (
              <li
                key={`${r.roundId}-${r.userId}`}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 text-black/40">{i + 1}.</span>
                  {totalsScope === "all" && <span>{playerLabel(r.userId)}</span>}
                  <span className="text-black/60">{r.datePlayed}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{r.total}</span>
                  <Link
                    href={`/rounds/${r.roundId}/summary`}
                    className="text-xs text-black/50 underline"
                  >
                    view
                  </Link>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Course total over time</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={totalsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Per-hole trend</h2>
          <select
            value={holeNumber}
            onChange={(e) => setHoleNumber(Number(e.target.value))}
            className="rounded border border-black/20 px-2 py-1 text-sm"
          >
            {(holeNumbers.length ? holeNumbers : [1]).map((h) => {
              const name = holeByNumber.get(h)?.name;
              return (
                <option key={h} value={h}>
                  Hole {h}
                  {name ? ` – ${name}` : ""}
                </option>
              );
            })}
          </select>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={holeTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="strokes" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">
          Hole records
          {selectedHole &&
            ` — ${selectedHole.name ?? `Hole ${holeNumber}`} (par ${selectedHole.par})`}
        </h2>
        {!courseId ? (
          <p className="text-sm text-black/60">No course set up yet.</p>
        ) : holeRecords.length === 0 ? (
          <p className="text-sm text-black/60">No scores recorded for this hole yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded border border-black/10 p-3">
              <div className="text-sm font-medium text-black/60">Best score</div>
              <div className="text-2xl font-bold">{bestScore}</div>
              <ul className="mt-1 space-y-0.5 text-sm">
                {bestEntries.map((r) => (
                  <li key={`${r.roundId}-${r.userId}`}>
                    {playerLabel(r.userId)} — {r.datePlayed}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-black/10 p-3">
              <div className="text-sm font-medium text-black/60">Holes-in-one</div>
              <div className="text-2xl font-bold">{aceEntries.length}</div>
              {aceEntries.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-sm">
                  {aceEntries.map((r) => (
                    <li key={`${r.roundId}-${r.userId}`}>
                      {playerLabel(r.userId)} — {r.datePlayed}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
