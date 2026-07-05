import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { upsertScore } from "@/lib/queries";

interface ScoreInput {
  roundId: string;
  userId: string;
  holeNumber: number;
  strokeCount: number | null;
  mulliganCount?: number;
  freeGameScored?: boolean;
  liveEntered?: boolean;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as ScoreInput | ScoreInput[];
  const scores = Array.isArray(body) ? body : [body];

  for (const score of scores) {
    if (!score.roundId || !score.userId || score.holeNumber == null) {
      return NextResponse.json({ error: "Invalid score payload" }, { status: 400 });
    }
    await upsertScore(score);
  }

  return NextResponse.json({ ok: true });
}
