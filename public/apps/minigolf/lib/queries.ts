import { getDB } from "./db";
import type { Course, Group, GroupMember, Hole, InviteStatus, Round, Score, User } from "./types";

// ---- users ----

export async function syncUser(id: string, email: string, name: string | null): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      `INSERT INTO users (id, email, name) VALUES (?1, ?2, ?3)
       ON CONFLICT (id) DO UPDATE SET email = excluded.email, name = excluded.name`
    )
    .bind(id, email, name)
    .run();
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return (await getDB())
    .prepare(`SELECT * FROM users WHERE email = ?1`)
    .bind(email)
    .first<User>();
}

export async function createGuestUser(name: string, email: string): Promise<User> {
  const db = await getDB();
  const id = `guest_${crypto.randomUUID()}`;
  await db
    .prepare(`INSERT INTO users (id, email, name, is_guest) VALUES (?1, ?2, ?3, 1)`)
    .bind(id, email, name)
    .run();
  return { id, email, name, created_at: new Date().toISOString(), is_guest: 1 };
}

export async function mergeGuestIntoRealUser(realUserId: string, email: string): Promise<void> {
  const db = await getDB();
  const guest = await db
    .prepare(`SELECT * FROM users WHERE email = ?1 AND is_guest = 1 AND id != ?2`)
    .bind(email, realUserId)
    .first<User>();
  if (!guest) return;

  await db.batch([
    db.prepare(`UPDATE scores SET user_id = ?1 WHERE user_id = ?2`).bind(realUserId, guest.id),
    db
      .prepare(`UPDATE group_members SET user_id = ?1 WHERE user_id = ?2`)
      .bind(realUserId, guest.id),
    db
      .prepare(`UPDATE courses SET created_by_user_id = ?1 WHERE created_by_user_id = ?2`)
      .bind(realUserId, guest.id),
    db.prepare(`DELETE FROM users WHERE id = ?1`).bind(guest.id),
  ]);
}

export async function listUsers(): Promise<User[]> {
  const db = await getDB();
  const { results } = await db.prepare(`SELECT * FROM users ORDER BY name`).all<User>();
  return results;
}

// ---- courses ----

export async function createCourse(name: string, createdByUserId: string): Promise<Course> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO courses (id, name, created_by_user_id) VALUES (?1, ?2, ?3)`)
    .bind(id, name, createdByUserId)
    .run();
  return { id, name, created_by_user_id: createdByUserId, created_at: new Date().toISOString() };
}

export async function updateCourse(courseId: string, name: string): Promise<void> {
  const db = await getDB();
  await db.prepare(`UPDATE courses SET name = ?1 WHERE id = ?2`).bind(name, courseId).run();
}

export async function deleteCourse(courseId: string): Promise<void> {
  const db = await getDB();
  await db.batch([
    db
      .prepare(
        `DELETE FROM scores WHERE round_id IN (SELECT id FROM rounds WHERE course_id = ?1)`
      )
      .bind(courseId),
    db.prepare(`DELETE FROM rounds WHERE course_id = ?1`).bind(courseId),
    db.prepare(`DELETE FROM holes WHERE course_id = ?1`).bind(courseId),
    db.prepare(`DELETE FROM courses WHERE id = ?1`).bind(courseId),
  ]);
}

export async function listCourses(): Promise<Course[]> {
  const db = await getDB();
  const { results } = await db.prepare(`SELECT * FROM courses ORDER BY name`).all<Course>();
  return results;
}

export async function getCourse(id: string): Promise<Course | null> {
  const db = await getDB();
  return db.prepare(`SELECT * FROM courses WHERE id = ?1`).bind(id).first<Course>();
}

export async function findCourseByName(name: string): Promise<Course | null> {
  const db = await getDB();
  return db
    .prepare(`SELECT * FROM courses WHERE name = ?1 COLLATE NOCASE`)
    .bind(name)
    .first<Course>();
}

// ---- holes ----

interface HoleInput {
  holeNumber: number;
  par: number;
  tipsAndTricksNotes?: string | null;
  name?: string | null;
  isFreeGameHole?: boolean;
}

export async function setCourseHoles(courseId: string, holes: HoleInput[]): Promise<void> {
  const db = await getDB();
  const statements = holes.map((h) =>
    db
      .prepare(
        `INSERT INTO holes (id, course_id, hole_number, par, tips_and_tricks_notes, name, is_free_game_hole)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT (course_id, hole_number) DO UPDATE SET
           par = excluded.par,
           tips_and_tricks_notes = excluded.tips_and_tricks_notes,
           name = excluded.name,
           is_free_game_hole = excluded.is_free_game_hole`
      )
      .bind(
        crypto.randomUUID(),
        courseId,
        h.holeNumber,
        h.par,
        h.tipsAndTricksNotes ?? null,
        h.name ?? null,
        h.isFreeGameHole ? 1 : 0
      )
  );
  await db.batch(statements);
}

export async function listHoles(courseId: string): Promise<Hole[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(`SELECT * FROM holes WHERE course_id = ?1 ORDER BY hole_number`)
    .bind(courseId)
    .all<Hole>();
  return results;
}

// ---- groups ----

export async function createGroup(name: string, createdByUserId: string): Promise<Group> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO groups (id, name, created_by_user_id) VALUES (?1, ?2, ?3)`)
    .bind(id, name, createdByUserId)
    .run();
  await db
    .prepare(
      `INSERT INTO group_members (id, group_id, user_id, status) VALUES (?1, ?2, ?3, 'accepted')`
    )
    .bind(crypto.randomUUID(), id, createdByUserId)
    .run();
  return { id, name, created_by_user_id: createdByUserId };
}

export async function listGroupsForUser(userId: string): Promise<Group[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT g.* FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = ?1 AND gm.status = 'accepted'
       ORDER BY g.name`
    )
    .bind(userId)
    .all<Group>();
  return results;
}

export async function inviteMember(
  groupId: string,
  invite: { userId?: string; invitedEmail?: string }
): Promise<GroupMember> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO group_members (id, group_id, user_id, invited_email, status) VALUES (?1, ?2, ?3, ?4, 'pending')`
    )
    .bind(id, groupId, invite.userId ?? null, invite.invitedEmail ?? null)
    .run();
  return {
    id,
    group_id: groupId,
    user_id: invite.userId ?? null,
    invited_email: invite.invitedEmail ?? null,
    status: "pending",
    nickname: null,
  };
}

export async function respondToInvite(
  memberId: string,
  userId: string,
  status: InviteStatus
): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      `UPDATE group_members SET status = ?1, user_id = ?2 WHERE id = ?3`
    )
    .bind(status, userId, memberId)
    .run();
}

export async function listPendingInvites(userEmail: string): Promise<(GroupMember & { group_name: string })[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT gm.*, g.name as group_name FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.invited_email = ?1 AND gm.status = 'pending'`
    )
    .bind(userEmail)
    .all<GroupMember & { group_name: string }>();
  return results;
}

export async function declineInvite(memberId: string): Promise<void> {
  const db = await getDB();
  await db.prepare(`DELETE FROM group_members WHERE id = ?1`).bind(memberId).run();
}

export async function listGroupMembers(groupId: string): Promise<GroupMember[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(`SELECT * FROM group_members WHERE group_id = ?1`)
    .bind(groupId)
    .all<GroupMember>();
  return results;
}

export async function setMemberNickname(memberId: string, nickname: string | null): Promise<void> {
  const db = await getDB();
  await db
    .prepare(`UPDATE group_members SET nickname = ?1 WHERE id = ?2`)
    .bind(nickname, memberId)
    .run();
}

// ---- rounds ----

export async function createRound(round: {
  courseId: string;
  groupId?: string | null;
  datePlayed: string;
  weatherConditions?: string | null;
  generalNotes?: string | null;
  completedAt?: string | null;
}): Promise<Round> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO rounds (id, course_id, group_id, date_played, weather_conditions, general_notes, completed_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(
      id,
      round.courseId,
      round.groupId ?? null,
      round.datePlayed,
      round.weatherConditions ?? null,
      round.generalNotes ?? null,
      round.completedAt ?? null
    )
    .run();
  return {
    id,
    course_id: round.courseId,
    group_id: round.groupId ?? null,
    date_played: round.datePlayed,
    weather_conditions: round.weatherConditions ?? null,
    general_notes: round.generalNotes ?? null,
    completed_at: round.completedAt ?? null,
    created_at: new Date().toISOString(),
  };
}

export async function getRound(id: string): Promise<Round | null> {
  const db = await getDB();
  return db.prepare(`SELECT * FROM rounds WHERE id = ?1`).bind(id).first<Round>();
}

export async function completeRound(roundId: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare(`UPDATE rounds SET completed_at = ?1 WHERE id = ?2`)
    .bind(new Date().toISOString(), roundId)
    .run();
}

export async function deleteRound(roundId: string): Promise<void> {
  const db = await getDB();
  await db.batch([
    db.prepare(`DELETE FROM scores WHERE round_id = ?1`).bind(roundId),
    db.prepare(`DELETE FROM rounds WHERE id = ?1`).bind(roundId),
  ]);
}

export async function deletePlayerScoresFromRound(
  roundId: string,
  userId: string
): Promise<void> {
  const db = await getDB();
  await db
    .prepare(`DELETE FROM scores WHERE round_id = ?1 AND user_id = ?2`)
    .bind(roundId, userId)
    .run();
}

export async function listRounds(filters: {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Round[]> {
  const db = await getDB();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.userId) {
    conditions.push(
      `r.id IN (SELECT round_id FROM scores WHERE user_id = ?${params.length + 1})`
    );
    params.push(filters.userId);
  }
  if (filters.dateFrom) {
    conditions.push(`r.date_played >= ?${params.length + 1}`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`r.date_played <= ?${params.length + 1}`);
    params.push(filters.dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await db
    .prepare(`SELECT r.* FROM rounds r ${where} ORDER BY r.date_played DESC`)
    .bind(...params)
    .all<Round>();
  return results;
}

// ---- scores ----

interface ScoreInput {
  roundId: string;
  userId: string;
  holeNumber: number;
  strokeCount: number | null;
  mulliganCount?: number;
  freeGameScored?: boolean;
  liveEntered?: boolean;
}

function buildUpsertScoreStatement(db: D1Database, score: ScoreInput) {
  return db
    .prepare(
      `INSERT INTO scores (id, round_id, user_id, hole_number, stroke_count, mulligan_count, free_game_scored, live_entered)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT (round_id, user_id, hole_number) DO UPDATE SET
         stroke_count = excluded.stroke_count,
         mulligan_count = excluded.mulligan_count,
         free_game_scored = excluded.free_game_scored,
         live_entered = excluded.live_entered`
    )
    .bind(
      crypto.randomUUID(),
      score.roundId,
      score.userId,
      score.holeNumber,
      score.strokeCount,
      score.mulliganCount ?? 0,
      score.freeGameScored ? 1 : 0,
      score.liveEntered ? 1 : 0
    );
}

export async function upsertScore(score: ScoreInput): Promise<void> {
  const db = await getDB();
  await buildUpsertScoreStatement(db, score).run();
}

/**
 * Writes many scores in as few D1 round-trips as possible — each db.batch()
 * call counts as a single Worker subrequest regardless of how many
 * statements it contains, unlike awaiting upsertScore() in a loop (used by
 * bulk paths like CSV import, which can otherwise easily exceed the
 * per-invocation subrequest limit).
 */
export async function upsertScoresBatch(scores: ScoreInput[]): Promise<void> {
  if (scores.length === 0) return;
  const db = await getDB();
  const statements = scores.map((score) => buildUpsertScoreStatement(db, score));

  const CHUNK_SIZE = 100;
  for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    await db.batch(statements.slice(i, i + CHUNK_SIZE));
  }
}

export async function listScoresForRound(roundId: string): Promise<Score[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(`SELECT * FROM scores WHERE round_id = ?1 ORDER BY hole_number`)
    .bind(roundId)
    .all<Score>();
  return results;
}

export async function listScoresForUser(
  userId: string,
  filters: { dateFrom?: string; dateTo?: string } = {}
): Promise<(Score & { date_played: string; course_id: string })[]> {
  const db = await getDB();
  const conditions = [`s.user_id = ?1`];
  const params: unknown[] = [userId];

  if (filters.dateFrom) {
    conditions.push(`r.date_played >= ?${params.length + 1}`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`r.date_played <= ?${params.length + 1}`);
    params.push(filters.dateTo);
  }

  const { results } = await db
    .prepare(
      `SELECT s.*, r.date_played, r.course_id FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY r.date_played`
    )
    .bind(...params)
    .all<Score & { date_played: string; course_id: string }>();
  return results;
}
