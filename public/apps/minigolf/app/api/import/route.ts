import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseCsv } from "@/lib/csv";
import {
  createCourse,
  createRound,
  findCourseByName,
  findUserByEmail,
  upsertScoresBatch,
} from "@/lib/queries";
import type { User } from "@/lib/types";

const HOLE_COLUMN_COUNT = 18;
const FREE_GAME_HOLE_NUMBER = 19;

function truthy(value?: string): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

interface PendingScore {
  roundId: string;
  userId: string;
  holeNumber: number;
  strokeCount: number | null;
  freeGameScored?: boolean;
  liveEntered: boolean;
}

/**
 * Expected CSV: one row per player per round. Columns: course_name,
 * date_played (YYYY-MM-DD), player_email, hole_1..hole_18 (stroke counts,
 * blank if not played), free_game (Yes/No — whether the free-game hole was
 * scored), conditions, general_notes. Rows sharing the same course_name +
 * date_played are grouped into one round.
 *
 * All score writes are collected and applied in one batch at the end
 * (see upsertScoresBatch) rather than one D1 call per hole per row — with
 * many rows that would otherwise blow past the per-invocation subrequest
 * limit.
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
  const playerCache = new Map<string, User | null>();

  let roundsCreated = 0;
  const pendingScores: PendingScore[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // account for the header row

    const courseName = row.course_name?.trim();
    const datePlayed = row.date_played?.trim();
    const playerEmail = row.player_email?.trim();

    if (!courseName || !datePlayed || !playerEmail) {
      skipped.push({
        row: rowNum,
        reason: "Missing course_name, date_played, or player_email",
      });
      continue;
    }

    const emailKey = playerEmail.toLowerCase();
    let player = playerCache.get(emailKey);
    if (player === undefined) {
      player = await findUserByEmail(playerEmail);
      playerCache.set(emailKey, player);
    }
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
        weatherConditions: row.conditions?.trim() || undefined,
        generalNotes: row.general_notes?.trim() || undefined,
        completedAt: new Date().toISOString(),
      });
      roundId = round.id;
      roundCache.set(roundKey, roundId);
      roundsCreated++;
    }

    let importedAnyForRow = false;

    for (let holeNumber = 1; holeNumber <= HOLE_COLUMN_COUNT; holeNumber++) {
      const raw = row[`hole_${holeNumber}`]?.trim();
      if (!raw) continue;

      const strokeCount = Number(raw);
      if (!Number.isFinite(strokeCount)) {
        skipped.push({
          row: rowNum,
          reason: `Invalid stroke count for hole_${holeNumber}: "${raw}"`,
        });
        continue;
      }

      pendingScores.push({
        roundId,
        userId: player.id,
        holeNumber,
        strokeCount,
        liveEntered: false,
      });
      importedAnyForRow = true;
    }

    if (truthy(row.free_game)) {
      pendingScores.push({
        roundId,
        userId: player.id,
        holeNumber: FREE_GAME_HOLE_NUMBER,
        strokeCount: null,
        freeGameScored: true,
        liveEntered: false,
      });
      importedAnyForRow = true;
    }

    if (!importedAnyForRow) {
      skipped.push({ row: rowNum, reason: "No hole scores or free game recorded" });
    }
  }

  await upsertScoresBatch(pendingScores);

  return NextResponse.json({ roundsCreated, scoresImported: pendingScores.length, skipped });
}
