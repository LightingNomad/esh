"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EditCourseForm from "@/components/EditCourseForm";
import { BASE_PATH } from "@/lib/basePath";
import type { Course } from "@/lib/types";

export default function CourseRow({ course }: { course: Course }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete "${course.name}" and all its rounds/scores? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await fetch(`${BASE_PATH}/api/courses/${course.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className="p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{course.name}</span>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/live/new?courseId=${course.id}`}
            className="rounded bg-green-600 px-3 py-1 text-white"
          >
            Start Live Round
          </Link>
          <Link
            href={`/post-game/new?courseId=${course.id}`}
            className="rounded bg-black/80 px-3 py-1 text-white"
          >
            Log Past Round
          </Link>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded bg-black/10 px-3 py-1"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      {editing && (
        <div className="mt-3">
          <EditCourseForm course={course} onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}
