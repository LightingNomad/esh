"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ImportResult {
  roundsCreated: number;
  scoresImported: number;
  skipped: { row: number; reason: string }[];
}

export default function CsvImportDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importFile(file: File) {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Import failed");
        return;
      }
      setResult((await res.json()) as ImportResult);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) importFile(file);
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors ${
          dragOver ? "border-green-600 bg-green-50" : "border-black/20"
        }`}
      >
        {uploading
          ? "Importing…"
          : "Drop a CSV file here, or click to choose one"}
        <div className="mt-1 text-xs text-black/50">
          Columns: course_name, date_played, player_email, hole_number,
          stroke_count, weather_conditions, general_notes, took_mulligan,
          hit_hole_nineteen_hole_in_one
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importFile(file);
          e.target.value = "";
        }}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="rounded border border-black/10 p-3 text-sm">
          <p>
            Imported {result.scoresImported} score{result.scoresImported === 1 ? "" : "s"} across{" "}
            {result.roundsCreated} new round{result.roundsCreated === 1 ? "" : "s"}.
          </p>
          {result.skipped.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-amber-700">
                {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"} skipped
              </summary>
              <ul className="mt-1 list-inside list-disc text-black/60">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    Row {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
