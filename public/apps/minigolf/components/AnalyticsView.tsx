"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface UserOption {
  id: string;
  email: string;
  name: string | null;
}

interface PlayerScore {
  round_id: string;
  hole_number: number;
  stroke_count: number;
  date_played: string;
}

export default function AnalyticsView({ users }: { users: UserOption[] }) {
  const [playerId, setPlayerId] = useState(users[0]?.id ?? "");
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [holeNumber, setHoleNumber] = useState(1);

  useEffect(() => {
    if (!playerId) return;
    fetch(`/api/players/${playerId}/scores`)
      .then((res) => res.json())
      .then((data) => setScores((data as { scores: PlayerScore[] }).scores));
  }, [playerId]);

  const totalsOverTime = useMemo(() => {
    const byRound = new Map<string, { date: string; total: number }>();
    for (const s of scores) {
      const existing = byRound.get(s.round_id) ?? { date: s.date_played, total: 0 };
      existing.total += s.stroke_count;
      byRound.set(s.round_id, existing);
    }
    return Array.from(byRound.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [scores]);

  const holeNumbers = useMemo(
    () => Array.from(new Set(scores.map((s) => s.hole_number))).sort((a, b) => a - b),
    [scores]
  );

  const holeTrend = useMemo(
    () =>
      scores
        .filter((s) => s.hole_number === holeNumber)
        .map((s) => ({ date: s.date_played, strokes: s.stroke_count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [scores, holeNumber]
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
              {u.name || u.email}
            </option>
          ))}
        </select>
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
            {(holeNumbers.length ? holeNumbers : [1]).map((h) => (
              <option key={h} value={h}>
                Hole {h}
              </option>
            ))}
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
    </div>
  );
}
