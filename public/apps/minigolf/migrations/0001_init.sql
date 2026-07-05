-- Mini-Golf Score Tracker: initial schema

CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Clerk user id
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE holes (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id),
  hole_number INTEGER NOT NULL,
  par INTEGER NOT NULL,
  tips_and_tricks_notes TEXT,
  UNIQUE (course_id, hole_number)
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  user_id TEXT REFERENCES users(id),
  invited_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL)
);

CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id),
  group_id TEXT REFERENCES groups(id),
  date_played TEXT NOT NULL,
  weather_conditions TEXT CHECK (weather_conditions IN ('sunny', 'rainy', 'damp', 'windy')),
  general_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  hole_number INTEGER NOT NULL,
  stroke_count INTEGER NOT NULL,
  took_mulligan INTEGER NOT NULL DEFAULT 0 CHECK (took_mulligan IN (0, 1)),
  hit_hole_nineteen_hole_in_one INTEGER NOT NULL DEFAULT 0 CHECK (hit_hole_nineteen_hole_in_one IN (0, 1)),
  live_entered INTEGER NOT NULL DEFAULT 0 CHECK (live_entered IN (0, 1)),
  UNIQUE (round_id, user_id, hole_number)
);

CREATE INDEX idx_holes_course ON holes(course_id);
CREATE INDEX idx_rounds_course ON rounds(course_id);
CREATE INDEX idx_rounds_group ON rounds(group_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_scores_round ON scores(round_id);
CREATE INDEX idx_scores_user ON scores(user_id);
