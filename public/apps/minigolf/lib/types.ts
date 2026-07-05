export type WeatherCondition = "sunny" | "rainy" | "damp" | "windy";
export type InviteStatus = "pending" | "accepted";

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  created_at: string;
  created_by_user_id: string;
}

export interface Hole {
  id: string;
  course_id: string;
  hole_number: number;
  par: number;
  tips_and_tricks_notes: string | null;
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
}

export interface Round {
  id: string;
  course_id: string;
  group_id: string | null;
  date_played: string;
  weather_conditions: WeatherCondition | null;
  general_notes: string | null;
  created_at: string;
}

export interface Score {
  id: string;
  round_id: string;
  user_id: string;
  hole_number: number;
  stroke_count: number;
  took_mulligan: number;
  hit_hole_nineteen_hole_in_one: number;
  live_entered: number;
}
