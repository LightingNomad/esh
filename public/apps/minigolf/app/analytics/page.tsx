import { listCourses, listHoles, listUsers } from "@/lib/queries";
import AnalyticsView from "@/components/AnalyticsView";

export default async function AnalyticsPage() {
  const [users, courses] = await Promise.all([listUsers(), listCourses()]);
  const course = courses[0] ?? null;
  const holes = course ? await listHoles(course.id) : [];

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Analytics</h1>
      <AnalyticsView users={users} courseId={course?.id ?? null} holes={holes} />
    </div>
  );
}
