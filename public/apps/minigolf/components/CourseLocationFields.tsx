"use client";

import { useState } from "react";

export default function CourseLocationFields({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(
          Math.round(pos.coords.latitude * 10000) / 10000,
          Math.round(pos.coords.longitude * 10000) / 10000
        );
        setLocating(false);
      },
      (err) => {
        setError(err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium">Location (for auto weather)</label>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="text-xs underline disabled:opacity-50"
        >
          {locating ? "Locating…" : "📍 Use current location"}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          step="any"
          placeholder="Latitude"
          value={latitude ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value), longitude)
          }
          className="w-full rounded border border-black/20 px-3 py-2"
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude"
          value={longitude ?? ""}
          onChange={(e) =>
            onChange(latitude, e.target.value === "" ? null : Number(e.target.value))
          }
          className="w-full rounded border border-black/20 px-3 py-2"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
