"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_PATH } from "@/lib/basePath";
import type { Hole, Score } from "@/lib/types";

interface Player {
  id: string;
  label: string;
}

interface CellEntry {
  strokeCount: string;
  mulliganCount: string;
  freeGameScored: boolean;
}

function cellKey(userId: string, holeNumber: number) {
  return `${userId}-${holeNumber}`;
}

const emptyCell: CellEntry = {
  strokeCount: "",
  mulliganCount: "0",
  freeGameScored: false,
};

export default function EditRoundForm({
  roundId,
  holes,
  players,
  initialScores,
  initialNotes,
  initialDatePlayed,
}: {
  roundId: string;
  holes: Hole[];
  players: Player[];
  initialScores: Score[];
  initialNotes: string | null;
  initialDatePlayed: string;
}) {
  const router = useRouter();
  const holeNumbers = holes.map((h) => h.hole_number).sort((a, b) => a - b);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [datePlayed, setDatePlayed] = useState(initialDatePlayed);
  const [cells, setCells] = useState<Record<string, CellEntry>>(() => {
    const map: Record<string, CellEntry> = {};
    for (const s of initialScores) {
      map[cellKey(s.user_id, s.hole_number)] = {
        strokeCount: s.stroke_count != null ? String(s.stroke_count) : "",
        mulliganCount: String(s.mulligan_count ?? 0),
        freeGameScored: Boolean(s.free_game_scored),
      };
    }
    return map;
  });
  const [saving, setSaving] = useState(false);

  function updateCell(userId: string, holeNumber: number, patch: Partial<CellEntry>) {
    const key = cellKey(userId, holeNumber);
    setCells((prev) => ({
      ...prev,
      [key]: {
        ...emptyCell,
        ...prev[key],
        ...patch,
      },
    }));
  }

  function playerTotal(userId: string) {
    return holes.reduce((sum, hole) => {
      if (hole.is_free_game_hole) return sum;
      const value = Number(cells[cellKey(userId, hole.hole_number)]?.strokeCount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const scores = [];
      for (const player of players) {
        for (const hole of holes) {
          const entry = cells[cellKey(player.id, hole.hole_number)];
          if (!entry) continue;
          if (hole.is_free_game_hole) {
            scores.push({
              roundId,
              userId: player.id,
              holeNumber: hole.hole_number,
              strokeCount: null,
              freeGameScored: entry.freeGameScored,
              liveEntered: false,
            });
          } else {
            if (entry.strokeCount === "") continue;
            scores.push({
              roundId,
              userId: player.id,
              holeNumber: hole.hole_number,
              strokeCount: Number(entry.strokeCount),
              mulliganCount: Number(entry.mulliganCount) || 0,
              liveEntered: false,
            });
          }
        }
      }

      await Promise.all([
        scores.length > 0
          ? fetch(`${BASE_PATH}/api/scores`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(scores),
            })
          : Promise.resolve(),
        fetch(`${BASE_PATH}/api/rounds/${roundId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generalNotes: notes, datePlayed }),
        }),
      ]);

      router.push(`/rounds/${roundId}/summary`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Date played</label>
        <input
          type="date"
          value={datePlayed}
          onChange={(e) => setDatePlayed(e.target.value)}
          className="rounded border border-black/20 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">General notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded border border-black/20 px-3 py-2"
          rows={2}
        />
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-black/60">No players recorded for this round.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-black/10 p-1 text-left">Player</th>
                {holeNumbers.map((num) => {
                  const hole = holes.find((h) => h.hole_number === num);
                  return (
                    <th
                      key={num}
                      className="border border-black/10 p-1"
                      title={hole?.name ?? undefined}
                    >
                      {hole?.is_free_game_hole ? "🎁" : num}
                    </th>
                  );
                })}
                <th className="border border-black/10 p-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="border border-black/10 p-1 font-medium">{player.label}</td>
                  {holes.map((hole) => {
                    const key = cellKey(player.id, hole.hole_number);
                    const entry = cells[key];
                    return (
                      <td key={hole.hole_number} className="border border-black/10 p-1">
                        {hole.is_free_game_hole ? (
                          <input
                            type="checkbox"
                            checked={entry?.freeGameScored ?? false}
                            onChange={(e) =>
                              updateCell(player.id, hole.hole_number, {
                                freeGameScored: e.target.checked,
                              })
                            }
                          />
                        ) : (
                          <>
                            <input
                              type="number"
                              min={0}
                              value={entry?.strokeCount ?? ""}
                              onChange={(e) =>
                                updateCell(player.id, hole.hole_number, {
                                  strokeCount: e.target.value,
                                })
                              }
                              className="w-12 rounded border border-black/20 px-1 py-0.5 text-center"
                            />
                            <div className="mt-1 flex items-center gap-1 text-[10px]">
                              <span>mull.</span>
                              <input
                                type="number"
                                min={0}
                                value={entry?.mulliganCount ?? "0"}
                                onChange={(e) =>
                                  updateCell(player.id, hole.hole_number, {
                                    mulliganCount: e.target.value,
                                  })
                                }
                                className="w-10 rounded border border-black/20 px-1 py-0.5 text-center"
                              />
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-black/10 p-1 text-center font-semibold">
                    {playerTotal(player.id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || players.length === 0}
        className="w-full rounded bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
