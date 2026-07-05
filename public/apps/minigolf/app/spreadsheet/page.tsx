import {
  getCourse,
  listHoles,
  listRounds,
  listScoresForRound,
  listScoresForUser,
  listUsers,
} from "@/lib/queries";
import SpreadsheetFilters from "@/components/SpreadsheetFilters";
import ShareButton from "@/components/ShareButton";
import type { Hole, Round, Score } from "@/lib/types";

interface RoundRow {
  round: Round;
  courseName: string;
  holes: Hole[];
  scores: Score[];
  coursePar: number;
}

function userLabel(users: { id: string; email: string; name: string | null }[], id: string) {
  const user = users.find((u) => u.id === id);
  return user?.name || user?.email || id;
}

export default async function SpreadsheetPage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string; dateFrom?: string; dateTo?: string; threshold?: string }>;
}) {
  const { player, dateFrom, dateTo, threshold } = await searchParams;
  const thresholdNum = threshold ? Number(threshold) : undefined;

  const users = await listUsers();

  const rounds = player
    ? await listRounds({ userId: player, dateFrom, dateTo })
    : await listRounds({ dateFrom, dateTo });

  const roundRows: RoundRow[] = await Promise.all(
    rounds.map(async (round) => {
      const [course, holes, scores] = await Promise.all([
        getCourse(round.course_id),
        listHoles(round.course_id),
        listScoresForRound(round.id),
      ]);
      const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
      return { round, courseName: course?.name ?? "Unknown course", holes, scores, coursePar };
    })
  );

  // Aggregate stats over the active data set.
  const aggregateScores: Score[] = player
    ? await listScoresForUser(player, { dateFrom, dateTo })
    : roundRows.flatMap((r) => r.scores);

  const holeAverages = new Map<number, { sum: number; count: number }>();
  for (const s of aggregateScores) {
    const bucket = holeAverages.get(s.hole_number) ?? { sum: 0, count: 0 };
    bucket.sum += s.stroke_count;
    bucket.count += 1;
    holeAverages.set(s.hole_number, bucket);
  }

  // Total per round+player, to average across the data set.
  const totalsByRoundPlayer = new Map<string, number>();
  for (const s of aggregateScores) {
    const key = `${s.round_id}-${s.user_id}`;
    totalsByRoundPlayer.set(key, (totalsByRoundPlayer.get(key) ?? 0) + s.stroke_count);
  }
  const totals = Array.from(totalsByRoundPlayer.values());
  const overallAverageTotal = totals.length
    ? totals.reduce((a, b) => a + b, 0) / totals.length
    : 0;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Spreadsheet View</h1>

      <SpreadsheetFilters
        users={users}
        initialPlayer={player ?? ""}
        initialDateFrom={dateFrom ?? ""}
        initialDateTo={dateTo ?? ""}
        initialThreshold={threshold ?? ""}
      />

      <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-black/10 p-3">
          <div className="text-xs text-black/60">Total average score (active data set)</div>
          <div className="text-2xl font-bold">{overallAverageTotal.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-black/10 p-3 sm:col-span-2">
          <div className="mb-1 text-xs text-black/60">Average score per hole</div>
          <div className="flex flex-wrap gap-3 text-sm">
            {Array.from(holeAverages.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([hole, { sum, count }]) => (
                <span key={hole}>
                  H{hole}: <strong>{(sum / count).toFixed(1)}</strong>
                </span>
              ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {roundRows.map(({ round, courseName, holes, scores, coursePar }) => {
          const playerIds = Array.from(new Set(scores.map((s) => s.user_id)));
          const playerTotals = playerIds.map((userId) => ({
            label: userLabel(users, userId),
            total: scores
              .filter((s) => s.user_id === userId)
              .reduce((sum, s) => sum + s.stroke_count, 0),
          }));
          return (
            <div key={round.id} className="overflow-x-auto rounded-lg border border-black/10">
              <div className="flex items-center justify-between border-b border-black/10 bg-black/5 p-2 text-sm font-medium">
                <span>
                  {courseName} — {round.date_played}
                  {round.weather_conditions ? ` · ${round.weather_conditions}` : ""}
                  {" · Course par: "}
                  {coursePar}
                </span>
                <ShareButton datePlayed={round.date_played} playerTotals={playerTotals} />
              </div>
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-black/10 p-1 text-left">Player</th>
                    {holes.map((h) => (
                      <th key={h.id} className="border border-black/10 p-1">
                        {h.hole_number}
                      </th>
                    ))}
                    <th className="border border-black/10 p-1">Total</th>
                    <th className="border border-black/10 p-1">+/- Par</th>
                  </tr>
                </thead>
                <tbody>
                  {playerIds.map((userId) => {
                    const playerScores = scores.filter((s) => s.user_id === userId);
                    const total = playerScores.reduce((sum, s) => sum + s.stroke_count, 0);
                    return (
                      <tr key={userId}>
                        <td className="border border-black/10 p-1 font-medium">
                          {userLabel(users, userId)}
                        </td>
                        {holes.map((h) => {
                          const cell = playerScores.find((s) => s.hole_number === h.hole_number);
                          const isAce = cell?.stroke_count === 1;
                          const overThreshold =
                            thresholdNum != null &&
                            cell != null &&
                            cell.stroke_count >= thresholdNum;
                          return (
                            <td
                              key={h.id}
                              className={`border border-black/10 p-1 text-center ${
                                isAce
                                  ? "bg-green-200"
                                  : overThreshold
                                    ? "bg-red-200"
                                    : ""
                              }`}
                            >
                              {cell ? `${cell.stroke_count}${cell.took_mulligan ? "*" : ""}` : ""}
                            </td>
                          );
                        })}
                        <td className="border border-black/10 p-1 text-center font-semibold">
                          {total}
                        </td>
                        <td className="border border-black/10 p-1 text-center">
                          {total - coursePar > 0 ? `+${total - coursePar}` : total - coursePar}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        {roundRows.length === 0 && (
          <p className="text-sm text-black/60">No rounds match the current filters.</p>
        )}
      </div>
    </div>
  );
}
