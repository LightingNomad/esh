import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteCourse, setCourseHoles, updateCourse } from "@/lib/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    holes: {
      holeNumber: number;
      par: number;
      tipsAndTricksNotes?: string;
      name?: string;
      isFreeGameHole?: boolean;
    }[];
  };

  await updateCourse(id, body.name, body.latitude, body.longitude);
  if (body.holes?.length) {
    await setCourseHoles(id, body.holes);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteCourse(id);
  return NextResponse.json({ ok: true });
}
