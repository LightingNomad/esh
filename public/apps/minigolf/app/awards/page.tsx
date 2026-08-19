import { listRoundYears, listUsers } from "@/lib/queries";
import AwardsView from "@/components/AwardsView";

export default async function AwardsPage() {
  const [users, availableYears] = await Promise.all([listUsers(), listRoundYears()]);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Awards</h1>
      <AwardsView users={users} availableYears={availableYears} />
    </div>
  );
}
