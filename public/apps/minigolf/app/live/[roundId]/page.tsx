import { auth } from "@clerk/nextjs/server";
import { getRound, listGroupMembers, listHoles, listScoresForRound, listUsers } from "@/lib/queries";
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

  const [holes, scores, users, groupMembers] = await Promise.all([
    listHoles(round.course_id),
    listScoresForRound(roundId),
    listUsers(),
    round.group_id ? listGroupMembers(round.group_id) : Promise.resolve([]),
  ]);

  const playerIds = (players ?? "").split(",").filter(Boolean);
  const players_ = playerIds.length
    ? playerIds
    : Array.from(new Set(scores.map((s) => s.user_id)));

  const roster = players_.map((id) => {
    const nickname = groupMembers.find((m) => m.user_id === id)?.nickname;
    const user = users.find((u) => u.id === id);
    return { id, label: nickname || user?.name || user?.email || id };
  });

  return <LiveScorecard roundId={roundId} holes={holes} players={roster} initialScores={scores} />;
}
