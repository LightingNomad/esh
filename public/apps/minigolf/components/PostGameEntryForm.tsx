"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Course, Hole, WeatherCondition } from "@/lib/types";

interface UserOption {
  id: string;
  email: string;
  name: string | null;
}

interface GroupOption {
  id: string;
  name: string;
}

interface CellEntry {
  strokeCount: string;
  tookMulligan: boolean;
  hitHoleNineteenHoleInOne: boolean;
}

const WEATHER_OPTIONS: WeatherCondition[] = ["sunny", "rainy", "damp", "windy"];
const BONUS_HOLE_NUMBER = 19;

function label(u: UserOption) {
  return u.name || u.email;
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
  const [weather, setWeather] = useState<WeatherCondition | "">("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [cells, setCells] = useState<Record<string, CellEntry>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    fetch(`/api/courses/${courseId}/holes`)
      .then((res) => res.json())
      .then((data) => setHoles((data as { holes: Hole[] }).holes));
  }, [courseId]);

  const holeNumbers = (() => {
    const nums = holes.map((h) => h.hole_number);
    if (!nums.includes(BONUS_HOLE_NUMBER)) nums.push(BONUS_HOLE_NUMBER);
    return nums.sort((a, b) => a - b);
  })();

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
    tookMulligan: false,
    hitHoleNineteenHoleInOne: false,
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
    return holeNumbers.reduce((sum, holeNumber) => {
      const value = Number(cells[cellKey(userId, holeNumber)]?.strokeCount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  async function handleSubmit() {
    if (!courseId || selectedPlayers.length === 0) return;
    setSubmitting(true);
    try {
      const roundRes = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          groupId: groupId || undefined,
          datePlayed,
          weatherConditions: weather || undefined,
          generalNotes: generalNotes || undefined,
        }),
      });
      const { round } = (await roundRes.json()) as { round: { id: string } };

      const scores = [];
      for (const userId of selectedPlayers) {
        for (const holeNumber of holeNumbers) {
          const entry = cells[cellKey(userId, holeNumber)];
          if (!entry || entry.strokeCount === "") continue;
          scores.push({
            roundId: round.id,
            userId,
            holeNumber,
            strokeCount: Number(entry.strokeCount),
            tookMulligan: entry.tookMulligan,
            hitHoleNineteenHoleInOne: entry.hitHoleNineteenHoleInOne,
            liveEntered: false,
          });
        }
      }
      if (scores.length > 0) {
        await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scores),
        });
      }

      router.push("/spreadsheet");
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
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value as WeatherCondition | "")}
            className="w-full rounded border border-black/20 px-3 py-2"
          >
            <option value="">Unspecified</option>
            {WEATHER_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
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
                {holeNumbers.map((num) => (
                  <th key={num} className="border border-black/10 p-1">
                    {num === BONUS_HOLE_NUMBER ? "H19" : num}
                  </th>
                ))}
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
                    {holeNumbers.map((holeNumber) => {
                      const key = cellKey(userId, holeNumber);
                      const entry = cells[key];
                      const isBonus = holeNumber === BONUS_HOLE_NUMBER;
                      return (
                        <td key={holeNumber} className="border border-black/10 p-1">
                          <input
                            type="number"
                            min={1}
                            value={entry?.strokeCount ?? ""}
                            onChange={(e) =>
                              updateCell(userId, holeNumber, { strokeCount: e.target.value })
                            }
                            className="w-12 rounded border border-black/20 px-1 py-0.5 text-center"
                          />
                          <div className="mt-1 flex flex-col gap-0.5 text-[10px]">
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={entry?.tookMulligan ?? false}
                                onChange={(e) =>
                                  updateCell(userId, holeNumber, {
                                    tookMulligan: e.target.checked,
                                  })
                                }
                              />
                              mull.
                            </label>
                            {isBonus && (
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={entry?.hitHoleNineteenHoleInOne ?? false}
                                  onChange={(e) =>
                                    updateCell(userId, holeNumber, {
                                      hitHoleNineteenHoleInOne: e.target.checked,
                                    })
                                  }
                                />
                                ace
                              </label>
                            )}
                          </div>
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
