import { getDB } from "./db";
import type {
  Course,
  Group,
  GroupMember,
  Hole,
  InviteStatus,
  Round,
  Score,
  User,
  UserRole,
} from "./types";

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
  return { id, email, name, created_at: new Date().toISOString(), is_guest: 1, role: "user" };
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

export async function isAdmin(userId: string): Promise<boolean> {
  const db = await getDB();
  const user = await db
    .prepare(`SELECT role FROM users WHERE id = ?1`)
    .bind(userId)
    .first<{ role: UserRole }>();
  return user?.role === "admin";
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const db = await getDB();
  await db.prepare(`UPDATE users SET role = ?1 WHERE id = ?2`).bind(role, userId).run();
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDB();
  return db.prepare(`SELECT * FROM users WHERE id = ?1`).bind(id).first<User>();
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  const db = await getDB();
  await db.prepare(`UPDATE users SET name = ?1 WHERE id = ?2`).bind(name, userId).run();
}

/**
 * Refuses to delete a user who created any courses or groups, rather than
 * silently orphaning those rows (created_by_user_id is NOT NULL) or
 * reassigning ownership the admin didn't ask for.
 */
export async function deleteUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDB();
  const owned = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM courses WHERE created_by_user_id = ?1) as courseCount,
         (SELECT COUNT(*) FROM groups WHERE created_by_user_id = ?1) as groupCount`
    )
    .bind(userId)
    .first<{ courseCount: number; groupCount: number }>();

  if (owned && (owned.courseCount > 0 || owned.groupCount > 0)) {
    return {
      ok: false,
      error: "This user created courses or groups still in use — reassign or remove those first.",
    };
  }

  await db.batch([
    db.prepare(`DELETE FROM scores WHERE user_id = ?1`).bind(userId),
    db.prepare(`DELETE FROM group_members WHERE user_id = ?1`).bind(userId),
    db.prepare(`DELETE FROM users WHERE id = ?1`).bind(userId),
  ]);
  return { ok: true };
}

// ---- courses ----

export async function createCourse(
  name: string,
  createdByUserId: string,
  latitude?: number | null,
  longitude?: number | null
): Promise<Course> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO courses (id, name, created_by_user_id, latitude, longitude) VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(id, name, createdByUserId, latitude ?? null, longitude ?? null)
    .run();
  return {
    id,
    name,
    created_by_user_id: createdByUserId,
    created_at: new Date().toISOString(),
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };
}

export async function updateCourse(
  courseId: string,
  name: string,
  latitude?: number | null,
  longitude?: number | null
): Promise<void> {
  const db = await getDB();
  await db
    .prepare(`UPDATE courses SET name = ?1, latitude = ?2, longitude = ?3 WHERE id = ?4`)
    .bind(name, latitude ?? null, longitude ?? null, courseId)
    .run();
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

export async function listGroups(): Promise<Group[]> {
  const db = await getDB();
  const { results } = await db.prepare(`SELECT * FROM groups ORDER BY name`).all<Group>();
  return results;
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

/**
 * Adds a user straight into a group as an accepted member, skipping the
 * pending-invite/accept flow — needed for guest users, who can't sign in to
 * accept an email invite themselves but still need a group_members row to
 * be eligible for a per-group nickname.
 */
export async function addGroupMember(groupId: string, userId: string): Promise<GroupMember> {
  const db = await getDB();
  const existing = await db
    .prepare(`SELECT * FROM group_members WHERE group_id = ?1 AND user_id = ?2`)
    .bind(groupId, userId)
    .first<GroupMember>();
  if (existing) return existing;

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO group_members (id, group_id, user_id, status) VALUES (?1, ?2, ?3, 'accepted')`
    )
    .bind(id, groupId, userId)
    .run();
  return {
    id,
    group_id: groupId,
    user_id: userId,
    invited_email: null,
    status: "accepted",
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
  weatherDescription?: string | null;
  generalNotes?: string | null;
  completedAt?: string | null;
  temperatureF?: number | null;
  humidityPct?: number | null;
  windSpeedMph?: number | null;
  barometricPressureInHg?: number | null;
  dewpointF?: number | null;
  visibilityMi?: number | null;
  heatIndexF?: number | null;
}): Promise<Round> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO rounds (
         id, course_id, group_id, date_played, weather_conditions, weather_description, general_notes, completed_at,
         temperature_f, humidity_pct, wind_speed_mph, barometric_pressure_inhg, dewpoint_f, visibility_mi, heat_index_f
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`
    )
    .bind(
      id,
      round.courseId,
      round.groupId ?? null,
      round.datePlayed,
      round.weatherConditions ?? null,
      round.weatherDescription ?? null,
      round.generalNotes ?? null,
      round.completedAt ?? null,
      round.temperatureF ?? null,
      round.humidityPct ?? null,
      round.windSpeedMph ?? null,
      round.barometricPressureInHg ?? null,
      round.dewpointF ?? null,
      round.visibilityMi ?? null,
      round.heatIndexF ?? null
    )
    .run();
  return {
    id,
    course_id: round.courseId,
    group_id: round.groupId ?? null,
    date_played: round.datePlayed,
    weather_conditions: round.weatherConditions ?? null,
    weather_description: round.weatherDescription ?? null,
    general_notes: round.generalNotes ?? null,
    completed_at: round.completedAt ?? null,
    created_at: new Date().toISOString(),
    temperature_f: round.temperatureF ?? null,
    humidity_pct: round.humidityPct ?? null,
    wind_speed_mph: round.windSpeedMph ?? null,
    barometric_pressure_inhg: round.barometricPressureInHg ?? null,
    dewpoint_f: round.dewpointF ?? null,
    visibility_mi: round.visibilityMi ?? null,
    heat_index_f: round.heatIndexF ?? null,
  };
}

export async function getRound(id: string): Promise<Round | null> {
  const db = await getDB();
  return db.prepare(`SELECT * FROM rounds WHERE id = ?1`).bind(id).first<Round>();
}

export async function updateRoundNotes(roundId: string, generalNotes: string | null): Promise<void> {
  const db = await getDB();
  await db
    .prepare(`UPDATE rounds SET general_notes = ?1 WHERE id = ?2`)
    .bind(generalNotes, roundId)
    .run();
}

export async function updateRoundDate(roundId: string, datePlayed: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare(`UPDATE rounds SET date_played = ?1 WHERE id = ?2`)
    .bind(datePlayed, roundId)
    .run();
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
  sort?: "asc" | "desc";
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
  const direction = filters.sort === "asc" ? "ASC" : "DESC";
  const { results } = await db
    .prepare(`SELECT r.* FROM rounds r ${where} ORDER BY r.date_played ${direction}`)
    .bind(...params)
    .all<Round>();
  return results;
}

/** Distinct years that have at least one round, newest first — powers the spreadsheet's quick year filter. */
export async function listRoundYears(): Promise<string[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT DISTINCT substr(date_played, 1, 4) AS year FROM rounds ORDER BY year DESC`
    )
    .all<{ year: string }>();
  return results.map((r) => r.year);
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

export interface HoleScoreRecord {
  userId: string;
  roundId: string;
  datePlayed: string;
  strokeCount: number;
}

/** Every recorded stroke count for one hole of one course, best (lowest) first — powers per-hole analytics (best score / holes-in-one). */
export async function listHoleScoreRecords(
  courseId: string,
  holeNumber: number
): Promise<HoleScoreRecord[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT s.user_id as userId, s.round_id as roundId, s.stroke_count as strokeCount, r.date_played as datePlayed
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE r.course_id = ?1 AND s.hole_number = ?2 AND s.stroke_count IS NOT NULL
       ORDER BY s.stroke_count ASC, r.date_played ASC`
    )
    .bind(courseId, holeNumber)
    .all<HoleScoreRecord>();
  return results;
}

export interface RoundTotal {
  roundId: string;
  userId: string;
  datePlayed: string;
  total: number;
}

/**
 * Full-round totals (all holes scored) for a course, best (lowest) or worst
 * (highest) first — powers the analytics "best/worst rounds ever" leaderboard.
 * Partial rounds are excluded so an unfinished round can't look like a record.
 */
export async function listRoundTotals(
  courseId: string,
  options: { userId?: string; sort?: "asc" | "desc" } = {}
): Promise<RoundTotal[]> {
  const db = await getDB();
  const conditions = [`r.course_id = ?1`, `s.stroke_count IS NOT NULL`];
  const params: unknown[] = [courseId];

  if (options.userId) {
    conditions.push(`s.user_id = ?${params.length + 1}`);
    params.push(options.userId);
  }

  const direction = options.sort === "desc" ? "DESC" : "ASC";
  const { results } = await db
    .prepare(
      `SELECT s.round_id as roundId, s.user_id as userId, r.date_played as datePlayed,
              SUM(s.stroke_count) as total
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE ${conditions.join(" AND ")}
       GROUP BY s.round_id, s.user_id
       HAVING COUNT(*) = (
         SELECT COUNT(*) FROM holes WHERE course_id = ?1 AND is_free_game_hole = 0
       )
       ORDER BY total ${direction}, r.date_played ASC`
    )
    .bind(...params)
    .all<RoundTotal>();
  return results;
}

export interface YearRoundTotal {
  roundId: string;
  userId: string;
  datePlayed: string;
  total: number;
}

/**
 * Full-round totals (all non-free-game holes scored) for every course, for
 * one calendar year — powers the Awards page, which aggregates across a
 * whole year rather than a single course like listRoundTotals does. The
 * "complete round" rule is the same, just re-checked per round via a
 * correlated subquery since rounds here can belong to different courses.
 */
export async function listRoundTotalsForYear(year: string): Promise<YearRoundTotal[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT s.round_id as roundId, s.user_id as userId, r.date_played as datePlayed,
              SUM(s.stroke_count) as total
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE substr(r.date_played, 1, 4) = ?1 AND s.stroke_count IS NOT NULL
       GROUP BY s.round_id, s.user_id
       HAVING COUNT(*) = (
         SELECT COUNT(*) FROM holes WHERE course_id = r.course_id AND is_free_game_hole = 0
       )`
    )
    .bind(year)
    .all<YearRoundTotal>();
  return results;
}

export interface YearPlayerTotal {
  userId: string;
  total: number;
}

/**
 * Total mulligans taken per player for a calendar year. Includes every
 * player with at least one scored round that year (total is 0 if they never
 * took one), so it also doubles as the Awards page's roster of "who played
 * this year" for awards that need a zero-inclusive baseline (e.g. holes-in-one).
 */
export async function listMulliganTotalsForYear(year: string): Promise<YearPlayerTotal[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT s.user_id as userId, SUM(s.mulligan_count) as total
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE substr(r.date_played, 1, 4) = ?1
       GROUP BY s.user_id`
    )
    .bind(year)
    .all<YearPlayerTotal>();
  return results;
}

export interface YearRoundMulligans {
  roundId: string;
  userId: string;
  mulligans: number;
}

/**
 * Mulligans taken per (round, player) for a calendar year — lets the Awards
 * page identify "tournament rounds" (mulligan-free) among the complete
 * rounds returned by listRoundTotalsForYear. Not restricted to complete
 * rounds itself; callers join against listRoundTotalsForYear by roundId+userId.
 */
export async function listRoundMulligansForYear(year: string): Promise<YearRoundMulligans[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT s.round_id as roundId, s.user_id as userId, SUM(s.mulligan_count) as mulligans
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE substr(r.date_played, 1, 4) = ?1
       GROUP BY s.round_id, s.user_id`
    )
    .bind(year)
    .all<YearRoundMulligans>();
  return results;
}

/**
 * Total free games scored per player for a calendar year. Includes every
 * player with at least one scored round that year (total is 0 if they never
 * scored one), same zero-inclusive roster semantics as listMulliganTotalsForYear.
 */
export async function listFreeGameTotalsForYear(year: string): Promise<YearPlayerTotal[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT s.user_id as userId, SUM(s.free_game_scored) as total
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE substr(r.date_played, 1, 4) = ?1
       GROUP BY s.user_id`
    )
    .bind(year)
    .all<YearPlayerTotal>();
  return results;
}

/** Total holes-in-one (stroke_count = 1) per player for a calendar year. Omits players with zero aces. */
export async function listAceTotalsForYear(year: string): Promise<YearPlayerTotal[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT s.user_id as userId, COUNT(*) as total
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE substr(r.date_played, 1, 4) = ?1 AND s.stroke_count = 1
       GROUP BY s.user_id`
    )
    .bind(year)
    .all<YearPlayerTotal>();
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
