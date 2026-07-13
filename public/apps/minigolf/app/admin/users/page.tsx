import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdmin, listUsers } from "@/lib/queries";
import AdminUsersView from "@/components/AdminUsersView";

export default async function AdminUsersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!(await isAdmin(userId))) redirect("/");

  const users = await listUsers();

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Manage Users</h1>
      <AdminUsersView users={users} currentUserId={userId} />
    </div>
  );
}
