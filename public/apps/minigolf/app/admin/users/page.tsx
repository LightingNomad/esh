import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdmin, listGroupMembers, listGroups, listUsers } from "@/lib/queries";
import AdminUsersView from "@/components/AdminUsersView";
import GroupMembersEditor from "@/components/GroupMembersEditor";

export default async function AdminUsersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!(await isAdmin(userId))) redirect("/");

  const [users, groups] = await Promise.all([listUsers(), listGroups()]);
  const groupMembersByGroup = await Promise.all(groups.map((g) => listGroupMembers(g.id)));

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Manage Users</h1>
        <AdminUsersView users={users} currentUserId={userId} />
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Player Nicknames</h2>
        <ul className="space-y-2 divide-y divide-black/10 rounded-lg border border-black/10">
          {groups.map((group, i) => (
            <li key={group.id} className="space-y-2 p-3">
              <span className="font-medium">{group.name}</span>
              <GroupMembersEditor
                groupId={group.id}
                members={groupMembersByGroup[i]}
                users={users}
              />
            </li>
          ))}
          {groups.length === 0 && (
            <li className="p-3 text-sm text-black/60">No groups yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
