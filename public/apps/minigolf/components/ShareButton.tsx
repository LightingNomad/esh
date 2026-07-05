"use client";

import { useState } from "react";
import { buildShareText, type PlayerTotal } from "@/lib/share";

export default function ShareButton({
  datePlayed,
  playerTotals,
}: {
  datePlayed: string;
  playerTotals: PlayerTotal[];
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const text = buildShareText(datePlayed, playerTotals);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      className="rounded bg-black/80 px-3 py-1.5 text-sm text-white"
    >
      {copied ? "Copied!" : "Share ⛳️"}
    </button>
  );
}
