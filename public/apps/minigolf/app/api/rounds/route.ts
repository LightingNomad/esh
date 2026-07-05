import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createRound, listRounds } from "@/lib/queries";
import type { WeatherCondition } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const rounds = await listRounds({
    userId: searchParams.get("userId") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });
  return NextResponse.json({ rounds });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    courseId: string;
    groupId?: string;
    datePlayed: string;
    weatherConditions?: WeatherCondition;
    generalNotes?: string;
  };

  if (!body.courseId || !body.datePlayed) {
    return NextResponse.json(
      { error: "courseId and datePlayed are required" },
      { status: 400 }
    );
  }

  const round = await createRound({
    courseId: body.courseId,
    groupId: body.groupId,
    datePlayed: body.datePlayed,
    weatherConditions: body.weatherConditions,
    generalNotes: body.generalNotes,
  });
  return NextResponse.json({ round }, { status: 201 });
}
