"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GuestPlayerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/players/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      setName("");
      setEmail("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        type="text"
        placeholder="Guest name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded border border-black/20 px-3 py-2"
        required
      />
      <input
        type="email"
        placeholder="Guest email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded border border-black/20 px-3 py-2"
        required
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add Guest Player"}
      </button>
      <p className="w-full text-xs text-black/50">
        If they sign up later with this same email, their history will
        automatically link to their real account.
      </p>
    </form>
  );
}
