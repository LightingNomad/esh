import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listRoundTotals } from "@/lib/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const searchParams = req.nextUrl.searchParams;
  const sort = searchParams.get("sort") === "desc" ? "desc" : "asc";
  const player = searchParams.get("player") ?? undefined;

  const totals = await listRoundTotals(id, { userId: player, sort });
  return NextResponse.json({ totals });
}
