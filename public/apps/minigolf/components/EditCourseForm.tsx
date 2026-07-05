"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HoleEditorFields, { type HoleFormInput } from "@/components/HoleEditorFields";
import type { Course, Hole } from "@/lib/types";

export default function EditCourseForm({
  course,
  onDone,
}: {
  course: Course;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(course.name);
  const [holes, setHoles] = useState<HoleFormInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/courses/${course.id}/holes`)
      .then((res) => res.json())
      .then((data) => {
        const loaded = (data as { holes: Hole[] }).holes.map((h) => ({
          holeNumber: h.hole_number,
          par: h.par,
          tipsAndTricksNotes: h.tips_and_tricks_notes ?? "",
          name: h.name ?? "",
          isFreeGameHole: Boolean(h.is_free_game_hole),
        }));
        setHoles(loaded);
        setLoading(false);
      });
  }, [course.id]);

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
    setSubmitting(true);
    try {
      await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, holes }),
      });
      router.refresh();
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-black/60">Loading holes…</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-black/10 p-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded border border-black/20 px-3 py-2"
        required
      />
      <HoleEditorFields
        holes={holes}
        onUpdateHole={updateHole}
        onSetFreeGameHole={setFreeGameHole}
        onClearFreeGameHole={clearFreeGameHole}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded bg-green-600 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded bg-black/10 px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
