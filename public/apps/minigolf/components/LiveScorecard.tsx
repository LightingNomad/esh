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
  initialNotes,
}: {
  roundId: string;
  holes: Hole[];
  players: Player[];
  initialScores: Score[];
  initialNotes?: string | null;
}) {
  const router = useRouter();
  const freeGameHole = holes.find((h) => h.is_free_game_hole);
  const holeNumbers = useMemo(
    () => holes.map((h) => h.hole_number).sort((a, b) => a - b),
    [holes]
  );
  const playedHoleNumbers = useMemo(
    () => holeNumbers.filter((n) => !holes.find((h) => h.hole_number === n)?.is_free_game_hole),
    [holeNumbers, holes]
  );
  const frontNineHoles = playedHoleNumbers.slice(0, 9);
  const backNineHoles = playedHoleNumbers.slice(9, 18);

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
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);

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
        strokeCount: 0,
        mulliganCount: 0,
        freeGameScored: false,
      };
      const next = { ...current, ...patch };
      save(userId, holeNumber, next);
      return { ...prev, [key]: next };
    });
  }

  function sumStrokes(userId: string, holeNums: number[]) {
    return holeNums.reduce(
      (sum, n) => sum + (scores[scoreKey(userId, n)]?.strokeCount ?? 0),
      0
    );
  }

  async function saveNotes(value: string) {
    setNotes(value);
    setNotesSaving(true);
    try {
      await fetch(`${BASE_PATH}/api/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generalNotes: value }),
      });
    } finally {
      setNotesSaving(false);
    }
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

      <div className="mb-4 rounded-lg border border-black/10 p-3 text-sm">
        <div className="mb-1 font-semibold">Running Total</div>
        <div className="space-y-1">
          {players.map((player) => {
            const front = sumStrokes(player.id, frontNineHoles);
            const back = sumStrokes(player.id, backNineHoles);
            const total = front + back;
            const freeGameDone = freeGameHole
              ? Boolean(scores[scoreKey(player.id, freeGameHole.hole_number)]?.freeGameScored)
              : false;
            return (
              <div key={player.id} className="flex items-center justify-between">
                <span>{player.label}</span>
                <span className="text-black/60">
                  F9: {front} · B9: {back} · Tot: {total}
                  {freeGameHole && ` · Free Game: ${freeGameDone ? "✓" : "—"}`}
                </span>
              </div>
            );
          })}
        </div>
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
          const strokeCount = entry?.strokeCount ?? 0;
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
                          strokeCount: Math.max(0, strokeCount - 1),
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

      <div className="mt-4">
        <label className="mb-1 flex items-center justify-between text-sm font-medium">
          <span>General notes</span>
          {notesSaving && <span className="text-xs font-normal text-black/40">saving…</span>}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={(e) => saveNotes(e.target.value)}
          className="w-full rounded border border-black/20 px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      {freeGameHole && (
        <p className="mt-4 text-center text-xs text-black/40">
          Free Game hole: #{freeGameHole.hole_number}
          {freeGameHole.name ? ` (${freeGameHole.name})` : ""}
        </p>
      )}
    </div>
  );
}
