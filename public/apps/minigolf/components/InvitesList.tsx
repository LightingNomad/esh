"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_PATH } from "@/lib/basePath";

interface Invite {
  id: string;
  group_name: string;
}

export default function InvitesList({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function respond(id: string, status: "accepted" | "declined") {
    setRespondingId(id);
    try {
      await fetch(`${BASE_PATH}/api/invites/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
      {invites.map((invite) => (
        <li key={invite.id} className="flex items-center justify-between p-3">
          <span>{invite.group_name}</span>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => respond(invite.id, "accepted")}
              disabled={respondingId === invite.id}
              className="rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => respond(invite.id, "declined")}
              disabled={respondingId === invite.id}
              className="rounded bg-black/10 px-3 py-1 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
