"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WeatherInput from "@/components/WeatherInput";
import { BASE_PATH } from "@/lib/basePath";
import type { Course, Hole } from "@/lib/types";

interface UserOption {
  id: string;
  email: string;
  name: string | null;
  is_guest: number;
}

interface GroupOption {
  id: string;
  name: string;
}

interface CellEntry {
  strokeCount: string;
  mulliganCount: string;
  freeGameScored: boolean;
}

function label(u: UserOption) {
  return (u.name || u.email) + (u.is_guest ? " (guest)" : "");
}

export default function PostGameEntryForm({
  courses,
  users,
  groups,
  initialCourseId,
}: {
  courses: Course[];
  users: UserOption[];
  groups: GroupOption[];
  initialCourseId?: string;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(initialCourseId ?? courses[0]?.id ?? "");
  const [holes, setHoles] = useState<Hole[]>([]);
  const [groupId, setGroupId] = useState("");
  const [datePlayed, setDatePlayed] = useState(() => new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [cells, setCells] = useState<Record<string, CellEntry>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    fetch(`${BASE_PATH}/api/courses/${courseId}/holes`)
      .then((res) => res.json())
      .then((data) => setHoles((data as { holes: Hole[] }).holes));
  }, [courseId]);

  const holeNumbers = holes.map((h) => h.hole_number).sort((a, b) => a - b);

  function togglePlayer(id: string) {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function cellKey(userId: string, holeNumber: number) {
    return `${userId}-${holeNumber}`;
  }

  const emptyCell: CellEntry = {
    strokeCount: "",
    mulliganCount: "0",
    freeGameScored: false,
  };

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

  async function handleSubmit() {
    if (!courseId || selectedPlayers.length === 0) return;
    setSubmitting(true);
    try {
      const roundRes = await fetch(`${BASE_PATH}/api/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          groupId: groupId || undefined,
          datePlayed,
          weatherConditions: weather || undefined,
          generalNotes: generalNotes || undefined,
          completed: true,
        }),
      });
      const { round } = (await roundRes.json()) as { round: { id: string } };

      const scores = [];
      for (const userId of selectedPlayers) {
        for (const hole of holes) {
          const entry = cells[cellKey(userId, hole.hole_number)];
          if (!entry) continue;
          if (hole.is_free_game_hole) {
            if (!entry.freeGameScored) continue;
            scores.push({
              roundId: round.id,
              userId,
              holeNumber: hole.hole_number,
              strokeCount: null,
              freeGameScored: true,
              liveEntered: false,
            });
          } else {
            if (entry.strokeCount === "") continue;
            scores.push({
              roundId: round.id,
              userId,
              holeNumber: hole.hole_number,
              strokeCount: Number(entry.strokeCount),
              mulliganCount: Number(entry.mulliganCount) || 0,
              liveEntered: false,
            });
          }
        }
      }
      if (scores.length > 0) {
        await fetch(`${BASE_PATH}/api/scores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scores),
        });
      }

      router.push(`/rounds/${round.id}/summary`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Course</label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full rounded border border-black/20 px-3 py-2"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input
            type="date"
            value={datePlayed}
            onChange={(e) => setDatePlayed(e.target.value)}
            className="w-full rounded border border-black/20 px-3 py-2"
          />
        </div>
        {groups.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium">Group (optional)</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded border border-black/20 px-3 py-2"
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">Weather</label>
          <WeatherInput value={weather} onChange={setWeather} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">General notes</label>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          className="w-full rounded border border-black/20 px-3 py-2"
          rows={2}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Players</label>
        <div className="flex flex-wrap gap-2">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => togglePlayer(u.id)}
              className={`rounded-full px-3 py-1 text-sm ${
                selectedPlayers.includes(u.id) ? "bg-green-600 text-white" : "bg-black/10"
              }`}
            >
              {label(u)}
            </button>
          ))}
        </div>
      </div>

      {selectedPlayers.length > 0 && (
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
              {selectedPlayers.map((userId) => {
                const user = users.find((u) => u.id === userId);
                return (
                  <tr key={userId}>
                    <td className="border border-black/10 p-1 font-medium">
                      {user ? label(user) : userId}
                    </td>
                    {holes.map((hole) => {
                      const key = cellKey(userId, hole.hole_number);
                      const entry = cells[key];
                      return (
                        <td key={hole.hole_number} className="border border-black/10 p-1">
                          {hole.is_free_game_hole ? (
                            <input
                              type="checkbox"
                              checked={entry?.freeGameScored ?? false}
                              onChange={(e) =>
                                updateCell(userId, hole.hole_number, {
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
                                  updateCell(userId, hole.hole_number, {
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
                                    updateCell(userId, hole.hole_number, {
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
                      {playerTotal(userId)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !courseId || selectedPlayers.length === 0}
        className="w-full rounded bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save Round"}
      </button>
    </div>
  );
}
