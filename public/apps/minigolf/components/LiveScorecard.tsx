"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Hole, Score } from "@/lib/types";
import { BASE_PATH } from "@/lib/basePath";

interface Player {
  id: string;
  label: string;
}

interface ScoreEntry {
  strokeCount: number | null;
  mulliganCount: number;
  freeGameScored: boolean;
}

function scoreKey(userId: string, holeNumber: number) {
  return `${userId}-${holeNumber}`;
}

export default function LiveScorecard({
  roundId,
  holes,
  players,
  initialScores,
}: {
  roundId: string;
  holes: Hole[];
  players: Player[];
  initialScores: Score[];
}) {
  const router = useRouter();
  const freeGameHole = holes.find((h) => h.is_free_game_hole);
  const holeNumbers = useMemo(
    () => holes.map((h) => h.hole_number).sort((a, b) => a - b),
    [holes]
  );

  const [currentHole, setCurrentHole] = useState(holeNumbers[0] ?? 1);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>(() => {
    const map: Record<string, ScoreEntry> = {};
    for (const s of initialScores) {
      map[scoreKey(s.user_id, s.hole_number)] = {
        strokeCount: s.stroke_count,
        mulliganCount: s.mulligan_count,
        freeGameScored: Boolean(s.free_game_scored),
      };
    }
    return map;
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [finishing, setFinishing] = useState(false);

  const currentHoleInfo = holes.find((h) => h.hole_number === currentHole);
  const isCurrentHoleFreeGame = Boolean(currentHoleInfo?.is_free_game_hole);
  const par = currentHoleInfo?.par;

  function isHoleComplete(holeNumber: number) {
    return players.length > 0 && players.every((p) => scores[scoreKey(p.id, holeNumber)]);
  }

  async function save(userId: string, holeNumber: number, entry: ScoreEntry) {
    const key = scoreKey(userId, holeNumber);
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      await fetch(`${BASE_PATH}/api/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId,
          userId,
          holeNumber,
          strokeCount: entry.strokeCount,
          mulliganCount: entry.mulliganCount,
          freeGameScored: entry.freeGameScored,
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
        strokeCount: 1,
        mulliganCount: 0,
        freeGameScored: false,
      };
      const next = { ...current, ...patch };
      save(userId, holeNumber, next);
      return { ...prev, [key]: next };
    });
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await fetch(`${BASE_PATH}/api/rounds/${roundId}/complete`, { method: "POST" });
      router.push(`/rounds/${roundId}/summary`);
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Live Scorecard</h1>
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="rounded bg-black/80 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {finishing ? "Finishing…" : "Finish Round"}
        </button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {holeNumbers.map((num) => {
          const complete = isHoleComplete(num);
          const hole = holes.find((h) => h.hole_number === num);
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
              title={hole?.name ?? undefined}
            >
              {hole?.is_free_game_hole ? "🎁" : num}
            </button>
          );
        })}
      </div>

      <div className="mb-4 text-sm text-black/60">
        Hole {currentHole}
        {currentHoleInfo?.name ? ` · ${currentHoleInfo.name}` : ""}
        {isCurrentHoleFreeGame ? " · Free Game" : par ? ` · Par ${par}` : ""}
      </div>

      <ul className="space-y-3">
        {players.map((player) => {
          const key = scoreKey(player.id, currentHole);
          const entry = scores[key];
          const strokeCount = entry?.strokeCount ?? 1;
          const mulliganCount = entry?.mulliganCount ?? 0;

          return (
            <li key={player.id} className="rounded-lg border border-black/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{player.label}</span>
                {!isCurrentHoleFreeGame && (
                  <span className="text-lg font-bold">
                    {strokeCount}
                    {"*".repeat(mulliganCount)}
                  </span>
                )}
              </div>

              {isCurrentHoleFreeGame ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={entry?.freeGameScored ?? false}
                    onChange={(e) =>
                      updateEntry(player.id, currentHole, {
                        strokeCount: null,
                        freeGameScored: e.target.checked,
                      })
                    }
                  />
                  Free Game Scored?
                </label>
              ) : (
                <>
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

                  <div className="flex items-center gap-2 text-sm">
                    <span>Mulligans:</span>
                    <button
                      onClick={() =>
                        updateEntry(player.id, currentHole, {
                          mulliganCount: Math.max(0, mulliganCount - 1),
                        })
                      }
                      className="h-7 w-7 rounded-full bg-black/10"
                    >
                      −
                    </button>
                    <span>{mulliganCount}</span>
                    <button
                      onClick={() =>
                        updateEntry(player.id, currentHole, { mulliganCount: mulliganCount + 1 })
                      }
                      className="h-7 w-7 rounded-full bg-black/10"
                    >
                      +
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {freeGameHole && (
        <p className="mt-4 text-center text-xs text-black/40">
          Free Game hole: #{freeGameHole.hole_number}
          {freeGameHole.name ? ` (${freeGameHole.name})` : ""}
        </p>
      )}
    </div>
  );
}
