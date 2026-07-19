"use client";

import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/basePath";

export interface WeatherData {
  temperatureF: number | null;
  humidityPct: number | null;
  windSpeedMph: number | null;
  barometricPressureInHg: number | null;
  dewpointF: number | null;
  visibilityMi: number | null;
  heatIndexF: number | null;
  weatherDescription: string | null;
}

export const EMPTY_WEATHER: WeatherData = {
  temperatureF: null,
  humidityPct: null,
  windSpeedMph: null,
  barometricPressureInHg: null,
  dewpointF: null,
  visibilityMi: null,
  heatIndexF: null,
  weatherDescription: null,
};

const FIELDS: { key: keyof WeatherData; label: string; step: number }[] = [
  { key: "temperatureF", label: "Temp (°F)", step: 1 },
  { key: "humidityPct", label: "Humidity (%)", step: 1 },
  { key: "windSpeedMph", label: "Wind (mph)", step: 0.1 },
  { key: "barometricPressureInHg", label: "Barometer (inHg)", step: 0.01 },
  { key: "dewpointF", label: "Dewpoint (°F)", step: 1 },
  { key: "visibilityMi", label: "Visibility (mi)", step: 0.1 },
  { key: "heatIndexF", label: "Heat index (°F)", step: 1 },
];

export default function WeatherFields({
  courseId,
  value,
  onChange,
}: {
  courseId: string;
  value: WeatherData;
  onChange: (value: WeatherData) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState("");

  async function fetchWeather() {
    if (!courseId) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`${BASE_PATH}/api/weather?courseId=${courseId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to fetch weather");
      }
      onChange(data as WeatherData);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch weather");
      setStatus("error");
    }
  }

  useEffect(() => {
    if (courseId) fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return (
    <div className="space-y-2 rounded border border-black/10 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Weather conditions</span>
        <button
          type="button"
          onClick={fetchWeather}
          disabled={status === "loading" || !courseId}
          className="rounded bg-black/10 px-2 py-1 text-xs disabled:opacity-50"
        >
          {status === "loading" ? "Fetching…" : "Refresh from NOAA"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {value.weatherDescription && (
        <p className="text-sm text-black/70">NOAA conditions: {value.weatherDescription}</p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FIELDS.map(({ key, label, step }) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium">{label}</label>
            <input
              type="number"
              step={step}
              value={value[key] ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  [key]: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
