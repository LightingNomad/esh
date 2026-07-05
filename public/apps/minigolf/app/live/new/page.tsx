import { auth } from "@clerk/nextjs/server";
import { getCourse, listGroupsForUser, listUsers } from "@/lib/queries";
import NewLiveRoundForm from "@/components/NewLiveRoundForm";

export default async function NewLiveRoundPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const { courseId } = await searchParams;
  if (!courseId) {
    return <p className="p-4">Missing courseId.</p>;
  }

  const [course, users, groups] = await Promise.all([
    getCourse(courseId),
    listUsers(),
    listGroupsForUser(userId),
  ]);

  if (!course) {
    return <p className="p-4">Course not found.</p>;
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">Start Live Round — {course.name}</h1>
      <NewLiveRoundForm courseId={course.id} users={users} groups={groups} />
    </div>
  );
}
