import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createCourse, listCourses, setCourseHoles } from "@/lib/queries";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await listCourses();
  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    name: string;
    holes?: { holeNumber: number; par: number; tipsAndTricksNotes?: string }[];
  };

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const course = await createCourse(body.name, userId);
  if (body.holes?.length) {
    await setCourseHoles(course.id, body.holes);
  }

  return NextResponse.json({ course }, { status: 201 });
}
