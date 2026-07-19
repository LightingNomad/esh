import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createRound, listRounds } from "@/lib/queries";

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
    weatherConditions?: string;
    weatherDescription?: string | null;
    generalNotes?: string;
    completed?: boolean;
    temperatureF?: number | null;
    humidityPct?: number | null;
    windSpeedMph?: number | null;
    barometricPressureInHg?: number | null;
    dewpointF?: number | null;
    visibilityMi?: number | null;
    heatIndexF?: number | null;
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
    weatherDescription: body.weatherDescription,
    generalNotes: body.generalNotes,
    completedAt: body.completed ? new Date().toISOString() : undefined,
    temperatureF: body.temperatureF,
    humidityPct: body.humidityPct,
    windSpeedMph: body.windSpeedMph,
    barometricPressureInHg: body.barometricPressureInHg,
    dewpointF: body.dewpointF,
    visibilityMi: body.visibilityMi,
    heatIndexF: body.heatIndexF,
  });
  return NextResponse.json({ round }, { status: 201 });
}
