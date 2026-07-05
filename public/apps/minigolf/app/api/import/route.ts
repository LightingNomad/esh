import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseCsv } from "@/lib/csv";
import {
  createCourse,
  createRound,
  findCourseByName,
  findUserByEmail,
  upsertScore,
} from "@/lib/queries";
import type { WeatherCondition } from "@/lib/types";

const VALID_WEATHER: readonly string[] = ["sunny", "rainy", "damp", "windy"];

function truthy(value?: string): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

/**
 * Expected CSV columns: course_name, date_played (YYYY-MM-DD), player_email,
 * hole_number, stroke_count, and optionally weather_conditions, general_notes,
 * took_mulligan, hit_hole_nineteen_hole_in_one.
 * Rows sharing the same course_name + date_played are grouped into one round.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const csvText = await req.text();
  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV payload" }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  const courseCache = new Map<string, string>();
  const roundCache = new Map<string, string>();

  let roundsCreated = 0;
  let scoresImported = 0;
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // account for the header row

    const courseName = row.course_name?.trim();
    const datePlayed = row.date_played?.trim();
    const playerEmail = row.player_email?.trim();
    const holeNumber = Number(row.hole_number);
    const strokeCount = Number(row.stroke_count);

    if (
      !courseName ||
      !datePlayed ||
      !playerEmail ||
      !Number.isFinite(holeNumber) ||
      !Number.isFinite(strokeCount)
    ) {
      skipped.push({ row: rowNum, reason: "Missing or invalid required field" });
      continue;
    }

    const player = await findUserByEmail(playerEmail);
    if (!player) {
      skipped.push({ row: rowNum, reason: `Unknown player email: ${playerEmail}` });
      continue;
    }

    const courseKey = courseName.toLowerCase();
    let courseId = courseCache.get(courseKey);
    if (!courseId) {
      const existing = await findCourseByName(courseName);
      courseId = existing ? existing.id : (await createCourse(courseName, userId)).id;
      courseCache.set(courseKey, courseId);
    }

    const weatherRaw = row.weather_conditions?.trim().toLowerCase();
    const weatherConditions = VALID_WEATHER.includes(weatherRaw ?? "")
      ? (weatherRaw as WeatherCondition)
      : undefined;

    const roundKey = `${courseId}|${datePlayed}`;
    let roundId = roundCache.get(roundKey);
    if (!roundId) {
      const round = await createRound({
        courseId,
        datePlayed,
        weatherConditions,
        generalNotes: row.general_notes?.trim() || undefined,
      });
      roundId = round.id;
      roundCache.set(roundKey, roundId);
      roundsCreated++;
    }

    await upsertScore({
      roundId,
      userId: player.id,
      holeNumber,
      strokeCount,
      tookMulligan: truthy(row.took_mulligan),
      hitHoleNineteenHoleInOne: truthy(row.hit_hole_nineteen_hole_in_one),
      liveEntered: false,
    });
    scoresImported++;
  }

  return NextResponse.json({ roundsCreated, scoresImported, skipped });
}
