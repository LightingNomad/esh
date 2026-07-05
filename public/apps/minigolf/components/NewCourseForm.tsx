"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface HoleInput {
  holeNumber: number;
  par: number;
  tipsAndTricksNotes: string;
}

function defaultHoles(count: number): HoleInput[] {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 3,
    tipsAndTricksNotes: "",
  }));
}

export default function NewCourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [holeCount, setHoleCount] = useState(18);
  const [holes, setHoles] = useState<HoleInput[]>(defaultHoles(18));
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateHoleCount(count: number) {
    setHoleCount(count);
    setHoles((prev) => {
      const next = defaultHoles(count);
      for (let i = 0; i < Math.min(prev.length, count); i++) next[i] = prev[i];
      return next;
    });
  }

  function updateHole(index: number, patch: Partial<HoleInput>) {
    setHoles((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, holes }),
      });
      setName("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-black/10 p-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Course name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-black/20 px-3 py-2"
          required
        />
        <input
          type="number"
          min={1}
          max={36}
          value={holeCount}
          onChange={(e) => updateHoleCount(Number(e.target.value))}
          className="w-20 rounded border border-black/20 px-3 py-2"
          title="Number of holes"
        />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-sm underline"
      >
        {expanded ? "Hide" : "Edit"} par / tips per hole
      </button>

      {expanded && (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {holes.map((hole, i) => (
            <div key={hole.holeNumber} className="flex items-center gap-2 text-sm">
              <span className="w-14 shrink-0">Hole {hole.holeNumber}</span>
              <input
                type="number"
                min={1}
                value={hole.par}
                onChange={(e) => updateHole(i, { par: Number(e.target.value) })}
                className="w-16 rounded border border-black/20 px-2 py-1"
                title="Par"
              />
              <input
                type="text"
                placeholder="Tips & tricks"
                value={hole.tipsAndTricksNotes}
                onChange={(e) => updateHole(i, { tipsAndTricksNotes: e.target.value })}
                className="flex-1 rounded border border-black/20 px-2 py-1"
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-green-600 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add Course"}
      </button>
    </form>
  );
}
