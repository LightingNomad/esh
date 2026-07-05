"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HoleEditorFields, { defaultHoles, type HoleFormInput } from "@/components/HoleEditorFields";
import { BASE_PATH } from "@/lib/basePath";

export default function NewCourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [holeCount, setHoleCount] = useState(18);
  const [holes, setHoles] = useState<HoleFormInput[]>(defaultHoles(18));
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

  function updateHole(index: number, patch: Partial<HoleFormInput>) {
    setHoles((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  function setFreeGameHole(index: number) {
    setHoles((prev) => prev.map((h, i) => ({ ...h, isFreeGameHole: i === index })));
  }

  function clearFreeGameHole() {
    setHoles((prev) => prev.map((h) => ({ ...h, isFreeGameHole: false })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${BASE_PATH}/api/courses`, {
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
        {expanded ? "Hide" : "Edit"} hole names / par / free game
      </button>

      {expanded && (
        <HoleEditorFields
          holes={holes}
          onUpdateHole={updateHole}
          onSetFreeGameHole={setFreeGameHole}
          onClearFreeGameHole={clearFreeGameHole}
        />
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
