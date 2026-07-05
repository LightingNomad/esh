"use client";

import { useState } from "react";

export default function InviteToGroupForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/groups/${groupId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitedEmail: email }),
      });
      setEmail("");
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 text-sm">
      <input
        type="email"
        placeholder="Invite by email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded border border-black/20 px-2 py-1"
        required
      />
      <button
        type="submit"
        disabled={sending}
        className="rounded bg-black/80 px-3 py-1 text-white disabled:opacity-50"
      >
        {sent ? "Sent!" : sending ? "…" : "Invite"}
      </button>
    </form>
  );
}
