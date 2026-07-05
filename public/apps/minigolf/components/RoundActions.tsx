"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RoundActions({
  roundId,
  playerUserId,
  compact,
}: {
  roundId: string;
  playerUserId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleRemovePlayer() {
    if (!playerUserId) return;
    if (!confirm("Remove this player's scores from the round?")) return;
    setBusy(true);
    try {
      await fetch(`/api/rounds/${roundId}/players/${playerUserId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRound() {
    if (!confirm("Delete this entire round and all players' scores? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/rounds/${roundId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleRemovePlayer}
        disabled={busy}
        className="text-xs text-red-600 underline disabled:opacity-50"
      >
        Remove
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <Link href={`/rounds/${roundId}/summary`} className="underline">
        View Summary
      </Link>
      <button
        onClick={handleDeleteRound}
        disabled={busy}
        className="text-red-600 underline disabled:opacity-50"
      >
        Delete Round
      </button>
    </div>
  );
}
