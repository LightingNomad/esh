export type InviteStatus = "pending" | "accepted";
export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  is_guest: number;
  role: UserRole;
}

export interface Course {
  id: string;
  name: string;
  created_at: string;
  created_by_user_id: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Hole {
  id: string;
  course_id: string;
  hole_number: number;
  par: number;
  tips_and_tricks_notes: string | null;
  name: string | null;
  is_free_game_hole: number;
}

export interface Group {
  id: string;
  name: string;
  created_by_user_id: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  invited_email: string | null;
  status: InviteStatus;
  nickname: string | null;
}

export interface Round {
  id: string;
  course_id: string;
  group_id: string | null;
  date_played: string;
  weather_conditions: string | null;
  general_notes: string | null;
  completed_at: string | null;
  created_at: string;
  temperature_f: number | null;
  humidity_pct: number | null;
  wind_speed_mph: number | null;
  barometric_pressure_inhg: number | null;
  dewpoint_f: number | null;
  visibility_mi: number | null;
  heat_index_f: number | null;
}

export interface Score {
  id: string;
  round_id: string;
  user_id: string;
  hole_number: number;
  stroke_count: number | null;
  mulligan_count: number;
  free_game_scored: number;
  live_entered: number;
}
