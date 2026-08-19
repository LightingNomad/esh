"use client";

import { useEffect, useMemo, useState } from "react";
import { BASE_PATH } from "@/lib/basePath";

interface UserOption {
  id: string;
  email: string;
  name: string | null;
  is_guest: number;
}

interface RoundTotalEntry {
  roundId: string;
  userId: string;
  datePlayed: string;
  total: number;
}

interface PlayerTotalEntry {
  userId: string;
  total: number;
}

interface AwardsResponse {
  roundTotals: RoundTotalEntry[];
  previousRoundTotals: RoundTotalEntry[];
  mulligans: PlayerTotalEntry[];
  aces: PlayerTotalEntry[];
  freeGames: PlayerTotalEntry[];
}

interface Winner {
  userId: string;
  detail: string;
}

function label(u: UserOption) {
  return (u.name || u.email) + (u.is_guest ? " (guest)" : "");
}

function average(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Sample standard deviation; undefined below 2 data points since deviation isn't meaningful for a single round. */
function stddev(nums: number[]): number | null {
  if (nums.length < 2) return null;
  const mean = average(nums);
  const variance = nums.reduce((sum, n) => sum + (n - mean) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

/** First year mulligans were recorded — earlier years all show 0, which would be a misleading "award" rather than real data. */
const FIRST_MULLIGAN_YEAR = 2026;

function AwardCard({
  title,
  description,
  winners,
  playerLabel,
  emptyText,
}: {
  title: string;
  description: string;
  winners: Winner[];
  playerLabel: (userId: string) => string;
  emptyText: string;
}) {
  const sorted = useMemo(
    () => [...winners].sort((a, b) => playerLabel(a.userId).localeCompare(playerLabel(b.userId))),
    [winners, playerLabel]
  );

  return (
    <div className="rounded border border-black/10 p-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-black/50">{description}</div>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-black/50">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-0.5 text-sm">
          {sorted.map((w) => (
            <li key={w.userId} className="flex items-center justify-between gap-2">
              <span className="font-semibold">{playerLabel(w.userId)}</span>
              <span className="text-black/60">{w.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AwardsView({
  users,
  availableYears,
}: {
  users: UserOption[];
  availableYears: string[];
}) {
  const [year, setYear] = useState(availableYears[0] ?? "");
  const [data, setData] = useState<AwardsResponse | null>(null);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  function playerLabel(userId: string) {
    const u = userById.get(userId);
    return u ? label(u) : userId;
  }

  useEffect(() => {
    if (!year) return;
    setData(null);
    fetch(`${BASE_PATH}/api/awards?year=${year}`)
      .then((res) => res.json())
      .then((d) => setData(d as AwardsResponse));
  }, [year]);

  const mulligansTracked = Number(year) >= FIRST_MULLIGAN_YEAR;

  const awards = useMemo(() => {
    if (!data) return null;

    const totalsByUser = new Map<string, RoundTotalEntry[]>();
    for (const rt of data.roundTotals) {
      const arr = totalsByUser.get(rt.userId) ?? [];
      arr.push(rt);
      totalsByUser.set(rt.userId, arr);
    }

    const allTotals = data.roundTotals;
    const best = allTotals.length ? Math.min(...allTotals.map((r) => r.total)) : null;
    const worst = allTotals.length ? Math.max(...allTotals.map((r) => r.total)) : null;
    const bestEntries = best == null ? [] : allTotals.filter((r) => r.total === best);
    const worstEntries = worst == null ? [] : allTotals.filter((r) => r.total === worst);

    const stdevByUser: { userId: string; stdev: number; rounds: number }[] = [];
    for (const [userId, rounds] of totalsByUser) {
      const sd = stddev(rounds.map((r) => r.total));
      if (sd != null) stdevByUser.push({ userId, stdev: sd, rounds: rounds.length });
    }
    const minStdev = stdevByUser.length ? Math.min(...stdevByUser.map((s) => s.stdev)) : null;
    const maxStdev = stdevByUser.length ? Math.max(...stdevByUser.map((s) => s.stdev)) : null;
    const mostConsistent =
      minStdev == null ? [] : stdevByUser.filter((s) => Math.abs(s.stdev - minStdev) < 1e-9);
    const leastConsistent =
      maxStdev == null ? [] : stdevByUser.filter((s) => Math.abs(s.stdev - maxStdev) < 1e-9);

    const prevAvgByUser = new Map<string, number>();
    const prevTotalsByUser = new Map<string, number[]>();
    for (const rt of data.previousRoundTotals) {
      const arr = prevTotalsByUser.get(rt.userId) ?? [];
      arr.push(rt.total);
      prevTotalsByUser.set(rt.userId, arr);
    }
    for (const [userId, totals] of prevTotalsByUser) prevAvgByUser.set(userId, average(totals));

    const deltas: { userId: string; delta: number; thisAvg: number; prevAvg: number }[] = [];
    for (const [userId, rounds] of totalsByUser) {
      const prevAvg = prevAvgByUser.get(userId);
      if (prevAvg == null) continue;
      const thisAvg = average(rounds.map((r) => r.total));
      deltas.push({ userId, delta: thisAvg - prevAvg, thisAvg, prevAvg });
    }
    const improved = deltas.filter((d) => d.delta < 0);
    const worsened = deltas.filter((d) => d.delta > 0);
    const minDelta = improved.length ? Math.min(...improved.map((d) => d.delta)) : null;
    const maxDelta = worsened.length ? Math.max(...worsened.map((d) => d.delta)) : null;
    const mostImproved =
      minDelta == null ? [] : improved.filter((d) => Math.abs(d.delta - minDelta) < 1e-9);
    const leastImproved =
      maxDelta == null ? [] : worsened.filter((d) => Math.abs(d.delta - maxDelta) < 1e-9);

    const minMulligans = data.mulligans.length
      ? Math.min(...data.mulligans.map((m) => m.total))
      : null;
    const maxMulligans = data.mulligans.length
      ? Math.max(...data.mulligans.map((m) => m.total))
      : null;
    const leastMulligans =
      minMulligans == null ? [] : data.mulligans.filter((m) => m.total === minMulligans);
    const mostMulligans =
      maxMulligans == null ? [] : data.mulligans.filter((m) => m.total === maxMulligans);

    // data.mulligans covers every player with a scored round this year (even 0 mulligans),
    // so it doubles as the year's roster for filling in zero-ace players the aces query omits.
    const aceByUser = new Map(data.aces.map((a) => [a.userId, a.total]));
    const aceRoster = data.mulligans.map((m) => ({
      userId: m.userId,
      total: aceByUser.get(m.userId) ?? 0,
    }));
    const minAces = aceRoster.length ? Math.min(...aceRoster.map((a) => a.total)) : null;
    const maxAces = aceRoster.length ? Math.max(...aceRoster.map((a) => a.total)) : null;
    const leastAces = minAces == null ? [] : aceRoster.filter((a) => a.total === minAces);
    const mostAces =
      maxAces == null || maxAces === 0 ? [] : aceRoster.filter((a) => a.total === maxAces);

    const minFreeGames = data.freeGames.length
      ? Math.min(...data.freeGames.map((f) => f.total))
      : null;
    const maxFreeGames = data.freeGames.length
      ? Math.max(...data.freeGames.map((f) => f.total))
      : null;
    const leastFreeGames =
      minFreeGames == null ? [] : data.freeGames.filter((f) => f.total === minFreeGames);
    const mostFreeGames =
      maxFreeGames == null || maxFreeGames === 0
        ? []
        : data.freeGames.filter((f) => f.total === maxFreeGames);

    return {
      bestEntries,
      worstEntries,
      mostConsistent,
      leastConsistent,
      mostImproved,
      leastImproved,
      leastMulligans,
      mostMulligans,
      leastAces,
      mostAces,
      leastFreeGames,
      mostFreeGames,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {availableYears.length === 0 ? (
        <p className="text-sm text-black/60">No rounds recorded yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {availableYears.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  year === y
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-black/20 hover:bg-black/5"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {!awards ? (
            <p className="text-sm text-black/60">Loading…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <AwardCard
                title="Best score of the year"
                description="Lowest single-round total"
                winners={awards.bestEntries.map((r) => ({
                  userId: r.userId,
                  detail: `${r.total} — ${r.datePlayed}`,
                }))}
                playerLabel={playerLabel}
                emptyText="No complete rounds this year."
              />
              <AwardCard
                title="Worst score of the year"
                description="Highest single-round total"
                winners={awards.worstEntries.map((r) => ({
                  userId: r.userId,
                  detail: `${r.total} — ${r.datePlayed}`,
                }))}
                playerLabel={playerLabel}
                emptyText="No complete rounds this year."
              />
              <AwardCard
                title="Most consistent"
                description="Least round-to-round deviation (min. 2 rounds)"
                winners={awards.mostConsistent.map((s) => ({
                  userId: s.userId,
                  detail: `±${s.stdev.toFixed(1)} (${s.rounds} rounds)`,
                }))}
                playerLabel={playerLabel}
                emptyText="Not enough rounds yet."
              />
              <AwardCard
                title="Least consistent"
                description="Most round-to-round deviation (min. 2 rounds)"
                winners={awards.leastConsistent.map((s) => ({
                  userId: s.userId,
                  detail: `±${s.stdev.toFixed(1)} (${s.rounds} rounds)`,
                }))}
                playerLabel={playerLabel}
                emptyText="Not enough rounds yet."
              />
              <AwardCard
                title="Most improved"
                description="Average total dropped the most vs. previous year"
                winners={awards.mostImproved.map((d) => ({
                  userId: d.userId,
                  detail: `${d.delta.toFixed(1)} (${d.prevAvg.toFixed(1)} → ${d.thisAvg.toFixed(1)})`,
                }))}
                playerLabel={playerLabel}
                emptyText="No players with rounds in both this year and the previous one."
              />
              <AwardCard
                title="Least improved"
                description="Average total rose the most vs. previous year"
                winners={awards.leastImproved.map((d) => ({
                  userId: d.userId,
                  detail: `+${d.delta.toFixed(1)} (${d.prevAvg.toFixed(1)} → ${d.thisAvg.toFixed(1)})`,
                }))}
                playerLabel={playerLabel}
                emptyText="No players with rounds in both this year and the previous one."
              />
              <AwardCard
                title="Fewest mulligans"
                description={
                  mulligansTracked
                    ? "Total mulligans taken this year"
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}`
                }
                winners={
                  mulligansTracked
                    ? awards.leastMulligans.map((m) => ({ userId: m.userId, detail: `${m.total}` }))
                    : []
                }
                playerLabel={playerLabel}
                emptyText={
                  mulligansTracked
                    ? "No data yet."
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}.`
                }
              />
              <AwardCard
                title="Most mulligans"
                description={
                  mulligansTracked
                    ? "Total mulligans taken this year"
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}`
                }
                winners={
                  mulligansTracked
                    ? awards.mostMulligans.map((m) => ({ userId: m.userId, detail: `${m.total}` }))
                    : []
                }
                playerLabel={playerLabel}
                emptyText={
                  mulligansTracked
                    ? "No data yet."
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}.`
                }
              />
              <AwardCard
                title="Most holes-in-one"
                description="Total aces this year"
                winners={awards.mostAces.map((a) => ({ userId: a.userId, detail: `${a.total}` }))}
                playerLabel={playerLabel}
                emptyText="No holes-in-one this year."
              />
              <AwardCard
                title="Fewest holes-in-one"
                description="Among players with a scored round this year"
                winners={awards.leastAces.map((a) => ({ userId: a.userId, detail: `${a.total}` }))}
                playerLabel={playerLabel}
                emptyText="No data yet."
              />
              <AwardCard
                title="Most free games scored"
                description="Total free games this year"
                winners={awards.mostFreeGames.map((f) => ({
                  userId: f.userId,
                  detail: `${f.total}`,
                }))}
                playerLabel={playerLabel}
                emptyText="No free games scored this year."
              />
              <AwardCard
                title="Fewest free games scored"
                description="Among players with a scored round this year"
                winners={awards.leastFreeGames.map((f) => ({
                  userId: f.userId,
                  detail: `${f.total}`,
                }))}
                playerLabel={playerLabel}
                emptyText="No data yet."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
