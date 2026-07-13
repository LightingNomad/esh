import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCourse } from "@/lib/queries";
import { fetchCurrentWeather } from "@/lib/weather";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  const course = await getCourse(courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (course.latitude == null || course.longitude == null) {
    return NextResponse.json(
      { error: "This course doesn't have a location set yet" },
      { status: 400 }
    );
  }

  try {
    const weather = await fetchCurrentWeather(course.latitude, course.longitude);
    return NextResponse.json(weather);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch weather" },
      { status: 502 }
    );
  }
}
