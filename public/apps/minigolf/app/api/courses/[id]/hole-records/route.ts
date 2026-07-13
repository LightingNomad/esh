import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listHoleScoreRecords } from "@/lib/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const holeNumber = Number(req.nextUrl.searchParams.get("hole"));
  if (!Number.isInteger(holeNumber)) {
    return NextResponse.json({ error: "Invalid hole" }, { status: 400 });
  }

  const records = await listHoleScoreRecords(id, holeNumber);
  return NextResponse.json({ records });
}
