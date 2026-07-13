"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WeatherInput from "@/components/WeatherInput";
import WeatherFields, { EMPTY_WEATHER, type WeatherData } from "@/components/WeatherFields";
import { BASE_PATH } from "@/lib/basePath";

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

export default function NewLiveRoundForm({
  courseId,
  users,
  groups,
}: {
  courseId: string;
  users: UserOption[];
  groups: GroupOption[];
}) {
  const router = useRouter();
  const [order, setOrder] = useState<string[]>([]);
  const [datePlayed, setDatePlayed] = useState(() => new Date().toISOString().slice(0, 10));
  const [groupId, setGroupId] = useState("");
  const [weather, setWeather] = useState("");
  const [weatherData, setWeatherData] = useState<WeatherData>(EMPTY_WEATHER);
  const [starting, setStarting] = useState(false);

  const available = users.filter((u) => !order.includes(u.id));

  function label(u: UserOption) {
    return (u.name || u.email) + (u.is_guest ? " (guest)" : "");
  }

  function move(index: number, delta: number) {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleStart() {
    if (order.length === 0) return;
    setStarting(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          groupId: groupId || undefined,
          datePlayed,
          weatherConditions: weather || undefined,
          ...weatherData,
        }),
      });
      const { round } = (await res.json()) as { round: { id: string } };
      router.push(`/live/${round.id}?players=${order.join(",")}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
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
        <label className="mb-1 block text-sm font-medium">Weather (optional)</label>
        <WeatherInput value={weather} onChange={setWeather} />
      </div>

      <WeatherFields courseId={courseId} value={weatherData} onChange={setWeatherData} />

      <div>
        <label className="mb-1 block text-sm font-medium">Player turn order</label>
        <ul className="mb-2 space-y-1">
          {order.map((id, i) => {
            const user = users.find((u) => u.id === id);
            return (
              <li
                key={id}
                className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm"
              >
                <span>
                  {i + 1}. {user ? label(user) : id}
                </span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="px-2">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} className="px-2">
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrder((prev) => prev.filter((x) => x !== id))}
                    className="px-2 text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2">
          {available.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setOrder((prev) => [...prev, u.id])}
              className="rounded-full bg-black/10 px-3 py-1 text-sm"
            >
              + {label(u)}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={order.length === 0 || starting}
        className="w-full rounded bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {starting ? "Starting…" : "Start Round"}
      </button>
    </div>
  );
}
