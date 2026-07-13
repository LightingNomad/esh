import {
  getCourse,
  getRound,
  listGroupMembers,
  listHoles,
  listScoresForRound,
  listUsers,
} from "@/lib/queries";
import ShareButton from "@/components/ShareButton";
import type { PlayerTotal } from "@/lib/share";

export default async function RoundSummaryPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;
  const round = await getRound(roundId);
  if (!round) return <p className="p-4">Round not found.</p>;

  const [course, holes, scores, users, groupMembers] = await Promise.all([
    getCourse(round.course_id),
    listHoles(round.course_id),
    listScoresForRound(roundId),
    listUsers(),
    round.group_id ? listGroupMembers(round.group_id) : Promise.resolve([]),
  ]);

  const freeGameHole = holes.find((h) => h.is_free_game_hole);
  const coursePar = holes
    .filter((h) => !h.is_free_game_hole)
    .reduce((sum, h) => sum + h.par, 0);
  const playerIds = Array.from(new Set(scores.map((s) => s.user_id)));

  function labelFor(userId: string) {
    const nickname = groupMembers.find((m) => m.user_id === userId)?.nickname;
    if (nickname) return nickname;
    const user = users.find((u) => u.id === userId);
    return user?.name || user?.email || userId;
  }

  const playerTotals: PlayerTotal[] = playerIds.map((userId) => {
    const playerScores = scores.filter((s) => s.user_id === userId);
    const total = playerScores.reduce((sum, s) => sum + (s.stroke_count ?? 0), 0);
    const freeGame = freeGameHole
      ? Boolean(
          playerScores.find((s) => s.hole_number === freeGameHole.hole_number)?.free_game_scored
        )
      : false;
    return { label: labelFor(userId), total, freeGame };
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-1 text-2xl font-bold">Round Summary</h1>
      <div className="mb-4">
        <p className="text-sm text-black/60">
          {course?.name ?? "Unknown course"} — {round.date_played}
          {round.weather_conditions ? ` · ${round.weather_conditions}` : ""}
          {" · Course par: "}
          {coursePar}
        </p>
        {(round.temperature_f != null ||
          round.humidity_pct != null ||
          round.wind_speed_mph != null ||
          round.barometric_pressure_inhg != null ||
          round.dewpoint_f != null ||
          round.visibility_mi != null ||
          round.heat_index_f != null) && (
          <p className="text-xs text-black/50">
            {[
              round.temperature_f != null && `${round.temperature_f}°F`,
              round.heat_index_f != null && `feels like ${round.heat_index_f}°F`,
              round.humidity_pct != null && `${round.humidity_pct}% humidity`,
              round.wind_speed_mph != null && `${round.wind_speed_mph} mph wind`,
              round.barometric_pressure_inhg != null && `${round.barometric_pressure_inhg} inHg`,
              round.dewpoint_f != null && `${round.dewpoint_f}°F dewpoint`,
              round.visibility_mi != null && `${round.visibility_mi} mi visibility`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      <ul className="mb-6 divide-y divide-black/10 rounded-lg border border-black/10">
        {playerTotals.map((p) => (
          <li key={p.label} className="flex items-center justify-between p-3 text-sm">
            <span className="font-medium">{p.label}</span>
            <span>
              {p.total}
              {p.freeGame ? " +Free Game" : ""}
              {" ("}
              {p.total - coursePar > 0 ? `+${p.total - coursePar}` : p.total - coursePar}
              {")"}
            </span>
          </li>
        ))}
        {playerTotals.length === 0 && (
          <li className="p-3 text-sm text-black/60">No scores recorded for this round.</li>
        )}
      </ul>

      {round.completed_at ? (
        <ShareButton datePlayed={round.date_played} playerTotals={playerTotals} />
      ) : (
        <p className="text-sm text-black/50">
          This round hasn&apos;t been marked finished yet — sharing is only available once it&apos;s concluded.
        </p>
      )}
    </div>
  );
}
