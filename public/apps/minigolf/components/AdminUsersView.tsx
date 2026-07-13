"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_PATH } from "@/lib/basePath";
import type { User, UserRole } from "@/lib/types";

export default function AdminUsersView({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggleRole(user: User) {
    const nextRole: UserRole = user.role === "admin" ? "user" : "admin";
    setBusyId(user.id);
    setError("");
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update role");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete ${user.name || user.email}? This cannot be undone.`)) return;
    setBusyId(user.id);
    setError("");
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to delete user");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-black/10">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-black/5">
              <th className="border border-black/10 p-2 text-left">Name</th>
              <th className="border border-black/10 p-2 text-left">Email</th>
              <th className="border border-black/10 p-2 text-left">Type</th>
              <th className="border border-black/10 p-2 text-left">Role</th>
              <th className="border border-black/10 p-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const busy = busyId === u.id;
              return (
                <tr key={u.id}>
                  <td className="border border-black/10 p-2 font-medium">
                    {u.name || <span className="text-black/40">—</span>}
                    {isSelf && <span className="ml-1 text-xs text-black/40">(you)</span>}
                  </td>
                  <td className="border border-black/10 p-2">{u.email}</td>
                  <td className="border border-black/10 p-2">
                    {u.is_guest ? "Guest" : "Registered"}
                  </td>
                  <td className="border border-black/10 p-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.role === "admin" ? "bg-green-600 text-white" : "bg-black/10"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="border border-black/10 p-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRole(u)}
                        disabled={isSelf || busy}
                        className="rounded bg-black/10 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        {u.role === "admin" ? "Revoke admin" : "Make admin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        disabled={isSelf || busy}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="border border-black/10 p-3 text-center text-black/60">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
