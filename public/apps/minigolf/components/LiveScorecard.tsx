"use client";

import { useMemo, useState } from "react";
import type { Hole, Score } from "@/lib/types";
import ShareButton from "@/components/ShareButton";

interface Player {
  id: string;
  label: string;
}

interface ScoreEntry {
  strokeCount: number;
  tookMulligan: boolean;
  hitHoleNineteenHoleInOne: boolean;
}

const BONUS_HOLE_NUMBER = 19;

function scoreKey(userId: string, holeNumber: number) {
  return `${userId}-${holeNumber}`;
}

export default function LiveScorecard({
  roundId,
  datePlayed,
  holes,
  players,
  initialScores,
}: {
  roundId: string;
  datePlayed: string;
  holes: Hole[];
  players: Player[];
  initialScores: Score[];
}) {
  const holeNumbers = useMemo(() => {
    const nums = holes.map((h) => h.hole_number);
    if (!nums.includes(BONUS_HOLE_NUMBER)) nums.push(BONUS_HOLE_NUMBER);
    return nums.sort((a, b) => a - b);
  }, [holes]);

  const [currentHole, setCurrentHole] = useState(holeNumbers[0] ?? 1);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>(() => {
    const map: Record<string, ScoreEntry> = {};
    for (const s of initialScores) {
      map[scoreKey(s.user_id, s.hole_number)] = {
        strokeCount: s.stroke_count,
        tookMulligan: Boolean(s.took_mulligan),
        hitHoleNineteenHoleInOne: Boolean(s.hit_hole_nineteen_hole_in_one),
      };
    }
    return map;
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const par = holes.find((h) => h.hole_number === currentHole)?.par;

  function isHoleComplete(holeNumber: number) {
    return players.length > 0 && players.every((p) => scores[scoreKey(p.id, holeNumber)]);
  }

  async function save(userId: string, holeNumber: number, entry: ScoreEntry) {
    const key = scoreKey(userId, holeNumber);
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId,
          userId,
          holeNumber,
          strokeCount: entry.strokeCount,
          tookMulligan: entry.tookMulligan,
          hitHoleNineteenHoleInOne: entry.hitHoleNineteenHoleInOne,
          liveEntered: true,
        }),
      });
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  function updateEntry(userId: string, holeNumber: number, patch: Partial<ScoreEntry>) {
    const key = scoreKey(userId, holeNumber);
    setScores((prev) => {
      const current = prev[key] ?? {
        strokeCount: par ?? 3,
        tookMulligan: false,
        hitHoleNineteenHoleInOne: false,
      };
      const next = { ...current, ...patch };
      save(userId, holeNumber, next);
      return { ...prev, [key]: next };
    });
  }

  const playerTotals = players.map((player) => ({
    label: player.label,
    total: holeNumbers.reduce(
      (sum, num) => sum + (scores[scoreKey(player.id, num)]?.strokeCount ?? 0),
      0
    ),
  }));

  return (
    <div className="mx-auto max-w-md p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Live Scorecard</h1>
        <ShareButton datePlayed={datePlayed} playerTotals={playerTotals} />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {holeNumbers.map((num) => {
          const complete = isHoleComplete(num);
          const isBonus = num === BONUS_HOLE_NUMBER;
          return (
            <button
              key={num}
              onClick={() => setCurrentHole(num)}
              className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full text-xs font-semibold ${
                currentHole === num
                  ? "bg-green-600 text-white"
                  : complete
                    ? "bg-green-100 text-green-800"
                    : "bg-black/10"
              }`}
            >
              {isBonus ? "H19" : num}
            </button>
          );
        })}
      </div>

      <div className="mb-4 text-sm text-black/60">
        Hole {currentHole}
        {par ? ` · Par ${par}` : ""}
      </div>

      <ul className="space-y-3">
        {players.map((player) => {
          const key = scoreKey(player.id, currentHole);
          const entry = scores[key];
          const strokeCount = entry?.strokeCount ?? par ?? 3;
          const isBonus = currentHole === BONUS_HOLE_NUMBER;

          return (
            <li key={player.id} className="rounded-lg border border-black/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{player.label}</span>
                <span className="text-lg font-bold">
                  {strokeCount}
                  {entry?.tookMulligan ? "*" : ""}
                </span>
              </div>

              <div className="mb-2 flex items-center justify-center gap-4">
                <button
                  onClick={() =>
                    updateEntry(player.id, currentHole, {
                      strokeCount: Math.max(1, strokeCount - 1),
                    })
                  }
                  className="h-10 w-10 rounded-full bg-black/10 text-lg"
                >
                  −
                </button>
                <button
                  onClick={() =>
                    updateEntry(player.id, currentHole, { strokeCount: strokeCount + 1 })
                  }
                  className="h-10 w-10 rounded-full bg-black/10 text-lg"
                >
                  +
                </button>
                {saving[key] && <span className="text-xs text-black/40">saving…</span>}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={entry?.tookMulligan ?? false}
                    onChange={(e) =>
                      updateEntry(player.id, currentHole, { tookMulligan: e.target.checked })
                    }
                  />
                  Mulligan taken
                </label>
                {isBonus && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={entry?.hitHoleNineteenHoleInOne ?? false}
                      onChange={(e) =>
                        updateEntry(player.id, currentHole, {
                          hitHoleNineteenHoleInOne: e.target.checked,
                        })
                      }
                    />
                    Hole 19 hole-in-one 🎉
                  </label>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
