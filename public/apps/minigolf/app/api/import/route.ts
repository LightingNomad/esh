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

function truthy(value?: string): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

/**
 * Expected CSV columns: course_name, date_played (YYYY-MM-DD), player_email,
 * hole_number, and either stroke_count or free_game_scored (for the course's
 * free-game hole), plus optionally weather_conditions, general_notes,
 * mulligan_count.
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
    const freeGameScored = truthy(row.free_game_scored);
    const strokeCount = row.stroke_count?.trim() ? Number(row.stroke_count) : null;

    if (
      !courseName ||
      !datePlayed ||
      !playerEmail ||
      !Number.isFinite(holeNumber) ||
      (strokeCount === null && !freeGameScored) ||
      (strokeCount !== null && !Number.isFinite(strokeCount))
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

    const roundKey = `${courseId}|${datePlayed}`;
    let roundId = roundCache.get(roundKey);
    if (!roundId) {
      const round = await createRound({
        courseId,
        datePlayed,
        weatherConditions: row.weather_conditions?.trim() || undefined,
        generalNotes: row.general_notes?.trim() || undefined,
        completedAt: new Date().toISOString(),
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
      mulliganCount: row.mulligan_count ? Number(row.mulligan_count) || 0 : 0,
      freeGameScored,
      liveEntered: false,
    });
    scoresImported++;
  }

  return NextResponse.json({ roundsCreated, scoresImported, skipped });
}
