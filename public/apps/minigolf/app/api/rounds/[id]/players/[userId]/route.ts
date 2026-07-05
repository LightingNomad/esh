import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deletePlayerScoresFromRound } from "@/lib/queries";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { userId: authUserId } = await auth();
  if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, userId } = await params;
  await deletePlayerScoresFromRound(id, userId);
  return NextResponse.json({ ok: true });
}
