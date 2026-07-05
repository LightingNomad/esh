import { auth } from "@clerk/nextjs/server";
import { listCourses, listGroupsForUser, listUsers } from "@/lib/queries";
import PostGameEntryForm from "@/components/PostGameEntryForm";

export default async function PostGameEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const { courseId } = await searchParams;

  const [courses, users, groups] = await Promise.all([
    listCourses(),
    listUsers(),
    listGroupsForUser(userId),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Log Past Round</h1>
      <PostGameEntryForm
        courses={courses}
        users={users}
        groups={groups}
        initialCourseId={courseId}
      />
    </div>
  );
}
