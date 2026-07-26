"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_PATH } from "@/lib/basePath";
import type { User } from "@/lib/types";

export default function AddGroupMemberForm({
  groupId,
  candidates,
}: {
  groupId: string;
  candidates: User[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(candidates[0]?.id ?? "");
  const [adding, setAdding] = useState(false);

  if (candidates.length === 0) return null;

  async function handleAdd() {
    if (!userId) return;
    setAdding(true);
    try {
      await fetch(`${BASE_PATH}/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="rounded border border-black/20 px-2 py-1"
      >
        {candidates.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name || u.email}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className="rounded bg-black/10 px-2 py-1 disabled:opacity-50"
      >
        {adding ? "Adding…" : "Add guest to group"}
      </button>
    </div>
  );
}
