import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  listCourses,
  listGroupMembers,
  listGroupsForUser,
  listPendingInvites,
  listUsers,
} from "@/lib/queries";
import NewCourseForm from "@/components/NewCourseForm";
import NewGroupForm from "@/components/NewGroupForm";
import InvitesList from "@/components/InvitesList";
import InviteToGroupForm from "@/components/InviteToGroupForm";
import GroupMembersEditor from "@/components/GroupMembersEditor";
import GuestPlayerForm from "@/components/GuestPlayerForm";
import CourseRow from "@/components/CourseRow";
import CsvImportDropzone from "@/components/CsvImportDropzone";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const [courses, groups, invites, users] = await Promise.all([
    listCourses(),
    listGroupsForUser(userId),
    email ? listPendingInvites(email) : Promise.resolve([]),
    listUsers(),
  ]);

  const groupMembersByGroup = await Promise.all(
    groups.map((g) => listGroupMembers(g.id))
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {invites.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Pending Invites</h2>
          <InvitesList invites={invites} />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Courses</h2>
        <ul className="mb-3 divide-y divide-black/10 rounded-lg border border-black/10">
          {courses.map((course) => (
            <CourseRow key={course.id} course={course} />
          ))}
          {courses.length === 0 && (
            <li className="p-3 text-sm text-black/60">No courses yet — add one below.</li>
          )}
        </ul>
        <NewCourseForm />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Groups</h2>
        <ul className="mb-3 divide-y divide-black/10 rounded-lg border border-black/10">
          {groups.map((group, i) => (
            <li key={group.id} className="space-y-2 p-3">
              <span className="font-medium">{group.name}</span>
              <GroupMembersEditor
                groupId={group.id}
                members={groupMembersByGroup[i]}
                users={users}
              />
              <InviteToGroupForm groupId={group.id} />
            </li>
          ))}
          {groups.length === 0 && (
            <li className="p-3 text-sm text-black/60">No groups yet — create one below.</li>
          )}
        </ul>
        <NewGroupForm />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Guest Players</h2>
        <GuestPlayerForm />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Analytics &amp; History</h2>
        <div className="flex gap-3 text-sm">
          <Link href="/spreadsheet" className="underline">
            Spreadsheet View
          </Link>
          <Link href="/analytics" className="underline">
            Analytics
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Import from CSV</h2>
        <CsvImportDropzone />
      </section>
    </div>
  );
}
