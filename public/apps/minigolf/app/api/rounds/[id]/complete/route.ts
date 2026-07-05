import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { completeRound } from "@/lib/queries";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await completeRound(id);
  return NextResponse.json({ ok: true });
}
