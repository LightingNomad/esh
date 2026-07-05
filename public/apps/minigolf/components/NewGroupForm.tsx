"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_PATH } from "@/lib/basePath";

export default function NewGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${BASE_PATH}/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setName("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Group name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded border border-black/20 px-3 py-2"
        required
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add Group"}
      </button>
    </form>
  );
}
