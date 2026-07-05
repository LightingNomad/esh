import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRound, listHoles, listScoresForRound } from "@/lib/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const round = await getRound(id);
  if (!round) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [holes, scores] = await Promise.all([
    listHoles(round.course_id),
    listScoresForRound(id),
  ]);

  return NextResponse.json({ round, holes, scores });
}
