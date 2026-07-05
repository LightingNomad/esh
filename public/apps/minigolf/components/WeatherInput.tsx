"use client";

import { useState } from "react";

const PRESETS = ["sunny", "rainy", "damp", "windy"];

export default function WeatherInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [customMode, setCustomMode] = useState(value !== "" && !PRESETS.includes(value));

  return (
    <div className="space-y-2">
      <select
        value={customMode ? "custom" : value}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setCustomMode(true);
            onChange("");
          } else {
            setCustomMode(false);
            onChange(e.target.value);
          }
        }}
        className="w-full rounded border border-black/20 px-3 py-2"
      >
        <option value="">Unspecified</option>
        {PRESETS.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>
      {customMode && (
        <input
          type="text"
          placeholder="e.g. Freezing drizzle"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-black/20 px-3 py-2"
        />
      )}
    </div>
  );
}
