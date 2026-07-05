import { auth } from "@clerk/nextjs/server";
import { getRound, listHoles, listScoresForRound, listUsers } from "@/lib/queries";
import LiveScorecard from "@/components/LiveScorecard";

export default async function LiveRoundPage({
  params,
  searchParams,
}: {
  params: Promise<{ roundId: string }>;
  searchParams: Promise<{ players?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const { roundId } = await params;
  const { players } = await searchParams;

  const round = await getRound(roundId);
  if (!round) return <p className="p-4">Round not found.</p>;

  const [holes, scores, users] = await Promise.all([
    listHoles(round.course_id),
    listScoresForRound(roundId),
    listUsers(),
  ]);

  const playerIds = (players ?? "").split(",").filter(Boolean);
  const players_ = playerIds.length
    ? playerIds
    : Array.from(new Set(scores.map((s) => s.user_id)));

  const roster = players_.map((id) => {
    const user = users.find((u) => u.id === id);
    return { id, label: user?.name || user?.email || id };
  });

  return (
    <LiveScorecard
      roundId={roundId}
      datePlayed={round.date_played}
      holes={holes}
      players={roster}
      initialScores={scores}
    />
  );
}
