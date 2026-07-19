import {
  getCourse,
  listGroupMembers,
  listHoles,
  listRoundYears,
  listRounds,
  listScoresForRound,
  listScoresForUser,
  listUsers,
} from "@/lib/queries";
import SpreadsheetFilters from "@/components/SpreadsheetFilters";
import RoundActions from "@/components/RoundActions";
import HoleInfoPopover from "@/components/HoleInfoPopover";
import type { GroupMember, Hole, Round, Score, User } from "@/lib/types";

interface RoundRow {
  round: Round;
  courseName: string;
  holes: Hole[];
  scores: Score[];
  coursePar: number;
  groupMembers: GroupMember[];
}

function resolveLabel(users: User[], groupMembers: GroupMember[], userId: string) {
  const nickname = groupMembers.find((m) => m.user_id === userId)?.nickname;
  if (nickname) return nickname;
  const user = users.find((u) => u.id === userId);
  return user?.name || user?.email || userId;
}

export default async function SpreadsheetPage({
  searchParams,
}: {
  searchParams: Promise<{
    player?: string;
    dateFrom?: string;
    dateTo?: string;
    threshold?: string;
    sort?: string;
  }>;
}) {
  const { player, dateFrom, dateTo, threshold, sort } = await searchParams;
  const thresholdNum = threshold ? Number(threshold) : undefined;
  const sortDirection = sort === "asc" ? "asc" : "desc";

  const [users, availableYears] = await Promise.all([listUsers(), listRoundYears()]);

  const rounds = player
    ? await listRounds({ userId: player, dateFrom, dateTo, sort: sortDirection })
    : await listRounds({ dateFrom, dateTo, sort: sortDirection });

  const roundRows: RoundRow[] = await Promise.all(
    rounds.map(async (round) => {
      const [course, holes, scores, groupMembers] = await Promise.all([
        getCourse(round.course_id),
        listHoles(round.course_id),
        listScoresForRound(round.id),
        round.group_id ? listGroupMembers(round.group_id) : Promise.resolve([]),
      ]);
      const coursePar = holes
        .filter((h) => !h.is_free_game_hole)
        .reduce((sum, h) => sum + h.par, 0);
      return {
        round,
        courseName: course?.name ?? "Unknown course",
        holes,
        scores,
        coursePar,
        groupMembers,
      };
    })
  );

  // Aggregate stats over the active data set (free-game holes excluded, no stroke count).
  const aggregateScores: Score[] = player
    ? await listScoresForUser(player, { dateFrom, dateTo })
    : roundRows.flatMap((r) => r.scores);

  const holeAverages = new Map<number, { sum: number; count: number }>();
  for (const s of aggregateScores) {
    if (s.stroke_count == null) continue;
    const bucket = holeAverages.get(s.hole_number) ?? { sum: 0, count: 0 };
    bucket.sum += s.stroke_count;
    bucket.count += 1;
    holeAverages.set(s.hole_number, bucket);
  }

  // Total per round+player, to average across the data set.
  const totalsByRoundPlayer = new Map<string, number>();
  for (const s of aggregateScores) {
    if (s.stroke_count == null) continue;
    const key = `${s.round_id}-${s.user_id}`;
    totalsByRoundPlayer.set(key, (totalsByRoundPlayer.get(key) ?? 0) + s.stroke_count);
  }
  const totals = Array.from(totalsByRoundPlayer.values());
  const overallAverageTotal = totals.length
    ? totals.reduce((a, b) => a + b, 0) / totals.length
    : 0;

  const holeByNumber = new Map<number, Hole>();
  for (const row of roundRows) {
    for (const h of row.holes) {
      if (!holeByNumber.has(h.hole_number)) {
        holeByNumber.set(h.hole_number, h);
      }
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Spreadsheet View</h1>

      <SpreadsheetFilters
        users={users}
        availableYears={availableYears}
        initialPlayer={player ?? ""}
        initialDateFrom={dateFrom ?? ""}
        initialDateTo={dateTo ?? ""}
        initialThreshold={threshold ?? ""}
        initialSort={sortDirection}
      />

      <div className="my-4 space-y-6">
        {roundRows.map(({ round, courseName, holes, scores, coursePar, groupMembers }) => {
          const playerIds = Array.from(new Set(scores.map((s) => s.user_id)));
          return (
            <div key={round.id} className="overflow-x-auto rounded-lg border border-black/10">
              <div className="flex items-center justify-between border-b border-black/10 bg-black/5 p-2 text-sm font-medium">
                <span>
                  {courseName} — {round.date_played}
                  {round.weather_conditions ? ` · ${round.weather_conditions}` : ""}
                  {round.weather_description ? ` · ${round.weather_description}` : ""}
                  {" · Course par: "}
                  {coursePar}
                  {!round.completed_at && " · In progress"}
                </span>
                <RoundActions roundId={round.id} />
              </div>
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-black/10 p-1 text-left">Player</th>
                    {holes.map((h) => (
                      <th key={h.id} className="border border-black/10 p-1">
                        <HoleInfoPopover hole={h} />
                      </th>
                    ))}
                    <th className="border border-black/10 p-1">Total</th>
                    <th className="border border-black/10 p-1">+/- Par</th>
                    <th className="border border-black/10 p-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {playerIds.map((userId) => {
                    const playerScores = scores.filter((s) => s.user_id === userId);
                    const total = playerScores.reduce(
                      (sum, s) => sum + (s.stroke_count ?? 0),
                      0
                    );
                    return (
                      <tr key={userId}>
                        <td className="border border-black/10 p-1 font-medium">
                          {resolveLabel(users, groupMembers, userId)}
                        </td>
                        {holes.map((h) => {
                          const cell = playerScores.find((s) => s.hole_number === h.hole_number);
                          if (h.is_free_game_hole) {
                            return (
                              <td key={h.id} className="border border-black/10 p-1 text-center">
                                {cell?.free_game_scored ? "✓" : ""}
                              </td>
                            );
                          }
                          const isAce = cell?.stroke_count === 1;
                          const overThreshold =
                            thresholdNum != null &&
                            cell?.stroke_count != null &&
                            cell.stroke_count >= thresholdNum;
                          return (
                            <td
                              key={h.id}
                              className={`border border-black/10 p-1 text-center ${
                                isAce ? "bg-green-200" : overThreshold ? "bg-red-200" : ""
                              }`}
                            >
                              {cell?.stroke_count != null
                                ? `${cell.stroke_count}${"*".repeat(cell.mulligan_count)}`
                                : ""}
                            </td>
                          );
                        })}
                        <td className="border border-black/10 p-1 text-center font-semibold">
                          {total}
                        </td>
                        <td className="border border-black/10 p-1 text-center">
                          {total - coursePar > 0 ? `+${total - coursePar}` : total - coursePar}
                        </td>
                        <td className="border border-black/10 p-1 text-center">
                          <RoundActions roundId={round.id} playerUserId={userId} compact />
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

        {roundRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 border-t border-black/10 pt-4 text-sm">
            <span className="font-semibold">Averages (active data set):</span>
            {Array.from(holeAverages.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([hole, { sum, count }]) => {
                const h = holeByNumber.get(hole);
                return (
                  <span key={hole}>
                    {h ? (
                      <HoleInfoPopover hole={h} trigger={`H${hole}`} />
                    ) : (
                      `H${hole}`
                    )}
                    : <strong>{(sum / count).toFixed(1)}</strong>
                  </span>
                );
              })}
            <span className="ml-auto">
              Total average: <strong>{overallAverageTotal.toFixed(2)}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
