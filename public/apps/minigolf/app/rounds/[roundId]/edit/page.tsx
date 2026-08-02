import {
  getCourse,
  getRound,
  listGroupMembers,
  listHoles,
  listScoresForRound,
  listUsers,
} from "@/lib/queries";
import EditRoundForm from "@/components/EditRoundForm";

export default async function EditRoundPage({
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

  const playerIds = Array.from(new Set(scores.map((s) => s.user_id)));
  const roster = playerIds.map((id) => {
    const nickname = groupMembers.find((m) => m.user_id === id)?.nickname;
    const user = users.find((u) => u.id === id);
    return { id, label: nickname || user?.name || user?.email || id };
  });

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-1 text-2xl font-bold">Edit Round</h1>
      <p className="mb-4 text-sm text-black/60">
        {course?.name ?? "Unknown course"} — {round.date_played}
      </p>
      <EditRoundForm
        roundId={roundId}
        holes={holes}
        players={roster}
        initialScores={scores}
        initialNotes={round.general_notes}
        initialDatePlayed={round.date_played}
      />
    </div>
  );
}
