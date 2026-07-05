-- Refactor phase: guest players, hole names/free-game hole, nicknames,
-- freeform weather, multi-mulligans, round completion.
--
-- rounds and scores both need a full rebuild (SQLite can't drop a CHECK
-- constraint or change nullability via plain ALTER TABLE). D1's remote HTTP
-- API does not honor PRAGMA foreign_keys=OFF across statements in the same
-- call, so this rebuild is ordered to never DROP a table that a live row in
-- another table still references by foreign key: build both replacement
-- tables and copy data first (scores_new references rounds_new directly),
-- then drop the old scores (a leaf, nothing references it), promote
-- scores_new, only then drop the old rounds (nothing references it by name
-- anymore at that point), and finally promote rounds_new.

ALTER TABLE users ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0 CHECK (is_guest IN (0, 1));

ALTER TABLE holes ADD COLUMN name TEXT;
ALTER TABLE holes ADD COLUMN is_free_game_hole INTEGER NOT NULL DEFAULT 0 CHECK (is_free_game_hole IN (0, 1));
CREATE UNIQUE INDEX idx_holes_one_free_game_per_course ON holes(course_id) WHERE is_free_game_hole = 1;

ALTER TABLE group_members ADD COLUMN nickname TEXT;

CREATE TABLE rounds_new (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id),
  group_id TEXT REFERENCES groups(id),
  date_played TEXT NOT NULL,
  weather_conditions TEXT,
  general_notes TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO rounds_new (id, course_id, group_id, date_played, weather_conditions, general_notes, completed_at, created_at)
  SELECT id, course_id, group_id, date_played, weather_conditions, general_notes, created_at, created_at
  FROM rounds;

CREATE TABLE scores_new (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds_new(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  hole_number INTEGER NOT NULL,
  stroke_count INTEGER,
  mulligan_count INTEGER NOT NULL DEFAULT 0 CHECK (mulligan_count >= 0),
  free_game_scored INTEGER NOT NULL DEFAULT 0 CHECK (free_game_scored IN (0, 1)),
  live_entered INTEGER NOT NULL DEFAULT 0 CHECK (live_entered IN (0, 1)),
  UNIQUE (round_id, user_id, hole_number)
);
INSERT INTO scores_new (id, round_id, user_id, hole_number, stroke_count, mulligan_count, free_game_scored, live_entered)
  SELECT id, round_id, user_id, hole_number, stroke_count, took_mulligan, hit_hole_nineteen_hole_in_one, live_entered
  FROM scores;

DROP TABLE scores;
ALTER TABLE scores_new RENAME TO scores;
CREATE INDEX idx_scores_round ON scores(round_id);
CREATE INDEX idx_scores_user ON scores(user_id);

DROP TABLE rounds;
ALTER TABLE rounds_new RENAME TO rounds;
CREATE INDEX idx_rounds_course ON rounds(course_id);
CREATE INDEX idx_rounds_group ON rounds(group_id);
