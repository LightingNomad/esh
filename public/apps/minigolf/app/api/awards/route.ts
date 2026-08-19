import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  listAceTotalsForYear,
  listFreeGameTotalsForYear,
  listMulliganTotalsForYear,
  listRoundTotalsForYear,
} from "@/lib/queries";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = req.nextUrl.searchParams.get("year");
  if (!year || !/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  const previousYear = String(Number(year) - 1);

  const [roundTotals, previousRoundTotals, mulligans, aces, freeGames] = await Promise.all([
    listRoundTotalsForYear(year),
    listRoundTotalsForYear(previousYear),
    listMulliganTotalsForYear(year),
    listAceTotalsForYear(year),
    listFreeGameTotalsForYear(year),
  ]);

  return NextResponse.json({ roundTotals, previousRoundTotals, mulligans, aces, freeGames });
}
