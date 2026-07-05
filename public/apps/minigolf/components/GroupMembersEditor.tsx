"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupMember, User } from "@/lib/types";

function memberLabel(member: GroupMember, users: User[]) {
  if (member.user_id) {
    const user = users.find((u) => u.id === member.user_id);
    return user?.name || user?.email || member.user_id;
  }
  return member.invited_email ?? "Unknown";
}

export default function GroupMembersEditor({
  groupId,
  members,
  users,
}: {
  groupId: string;
  members: GroupMember[];
  users: User[];
}) {
  const router = useRouter();
  const [nicknames, setNicknames] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((m) => [m.id, m.nickname ?? ""]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  async function saveNickname(memberId: string) {
    setSavingId(memberId);
    try {
      await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nicknames[memberId] || null }),
      });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  if (members.length === 0) return null;

  return (
    <ul className="space-y-1 text-sm">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-2">
          <span className="w-32 shrink-0 truncate">{memberLabel(member, users)}</span>
          {member.status === "pending" && (
            <span className="text-xs text-black/40">(pending)</span>
          )}
          <input
            type="text"
            placeholder="Nickname"
            value={nicknames[member.id] ?? ""}
            onChange={(e) =>
              setNicknames((prev) => ({ ...prev, [member.id]: e.target.value }))
            }
            className="flex-1 rounded border border-black/20 px-2 py-1"
          />
          <button
            type="button"
            onClick={() => saveNickname(member.id)}
            disabled={savingId === member.id}
            className="rounded bg-black/10 px-2 py-1 disabled:opacity-50"
          >
            {savingId === member.id ? "…" : "Save"}
          </button>
        </li>
      ))}
    </ul>
  );
}
