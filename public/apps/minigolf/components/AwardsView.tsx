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

interface RoundMulliganEntry {
  roundId: string;
  userId: string;
  mulligans: number;
}

interface AwardsResponse {
  roundTotals: RoundTotalEntry[];
  previousRoundTotals: RoundTotalEntry[];
  mulligans: PlayerTotalEntry[];
  roundMulligans: RoundMulliganEntry[];
  aces: PlayerTotalEntry[];
  freeGames: PlayerTotalEntry[];
}

interface Winner {
  userId: string;
  detail: string;
}

/** A single row in an award's full click-to-expand ranking, already ordered best-first. */
interface RankRow {
  rank: number;
  userId: string;
  detail: string;
}

interface ModalPayload {
  title: string;
  description: string;
  rows: RankRow[];
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

/**
 * Ranks entries best-first by ascending `value` (pass a negated value to rank
 * descending). Ties share a rank, and the next rank skips accordingly
 * (1, 1, 3), matching standard competition ranking.
 */
function rankAll(items: { userId: string; value: number; detail: string }[]): RankRow[] {
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const rows: RankRow[] = [];
  let rank = 0;
  let prevValue: number | null = null;
  sorted.forEach((item, i) => {
    if (prevValue === null || item.value !== prevValue) rank = i + 1;
    prevValue = item.value;
    rows.push({ rank, userId: item.userId, detail: item.detail });
  });
  return rows;
}

function formatSigned(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
}

/** First year mulligans were recorded — earlier years all show 0, which would be a misleading "award" rather than real data. */
const FIRST_MULLIGAN_YEAR = 2026;

function AwardCard({
  title,
  description,
  winners,
  all,
  playerLabel,
  emptyText,
  onExpand,
}: {
  title: string;
  description: string;
  winners: Winner[];
  all: RankRow[];
  playerLabel: (userId: string) => string;
  emptyText: string;
  onExpand: (payload: ModalPayload) => void;
}) {
  const sorted = useMemo(
    () => [...winners].sort((a, b) => playerLabel(a.userId).localeCompare(playerLabel(b.userId))),
    [winners, playerLabel]
  );

  const clickable = all.length > 0;

  return (
    <div
      className={`rounded border border-black/10 p-3 ${
        clickable ? "cursor-pointer transition hover:border-black/30 hover:bg-black/[0.02]" : ""
      }`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onExpand({ title, description, rows: all }) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onExpand({ title, description, rows: all });
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        {clickable && <span className="shrink-0 text-xs text-black/40">View all ›</span>}
      </div>
      <div className="text-xs text-black/50">{description}</div>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-black/50">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-0.5 text-sm">
          {sorted.map((w, i) => (
            <li key={`${w.userId}-${i}`} className="flex items-center justify-between gap-2">
              <span className="font-semibold">{playerLabel(w.userId)}</span>
              <span className="text-black/60">{w.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AwardModal({
  payload,
  onClose,
  playerLabel,
}: {
  payload: ModalPayload;
  onClose: () => void;
  playerLabel: (userId: string) => string;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const rankCounts = new Map<number, number>();
  for (const r of payload.rows) rankCounts.set(r.rank, (rankCounts.get(r.rank) ?? 0) + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">{payload.title}</div>
            <div className="text-xs text-black/50">{payload.description}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-black/50 hover:bg-black/5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {payload.rows.length === 0 ? (
          <p className="mt-3 text-sm text-black/50">No data.</p>
        ) : (
          <ol className="mt-3 space-y-1 text-sm">
            {payload.rows.map((r, i) => (
              <li key={`${r.userId}-${i}`} className="flex items-center justify-between gap-2">
                <span className="w-8 shrink-0 text-black/40">
                  {(rankCounts.get(r.rank) ?? 1) > 1 ? `T-${r.rank}` : r.rank}
                </span>
                <span className="flex-1 font-medium">{playerLabel(r.userId)}</span>
                <span className="shrink-0 text-black/60">{r.detail}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
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
  const [modalPayload, setModalPayload] = useState<ModalPayload | null>(null);

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

  useEffect(() => {
    setModalPayload(null);
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
    const bestScoreAll = rankAll(
      allTotals.map((r) => ({ userId: r.userId, value: r.total, detail: `${r.total} — ${r.datePlayed}` }))
    );
    const worstScoreAll = rankAll(
      allTotals.map((r) => ({ userId: r.userId, value: -r.total, detail: `${r.total} — ${r.datePlayed}` }))
    );

    const avgByUser: { userId: string; avg: number; rounds: number }[] = [];
    for (const [userId, rounds] of totalsByUser) {
      avgByUser.push({ userId, avg: average(rounds.map((r) => r.total)), rounds: rounds.length });
    }
    const minAvg = avgByUser.length ? Math.min(...avgByUser.map((a) => a.avg)) : null;
    const maxAvg = avgByUser.length ? Math.max(...avgByUser.map((a) => a.avg)) : null;
    const bestAverage =
      minAvg == null ? [] : avgByUser.filter((a) => Math.abs(a.avg - minAvg) < 1e-9);
    const worstAverage =
      maxAvg == null ? [] : avgByUser.filter((a) => Math.abs(a.avg - maxAvg) < 1e-9);
    const avgDetail = (a: { avg: number; rounds: number }) =>
      `${a.avg.toFixed(1)} (${a.rounds} round${a.rounds === 1 ? "" : "s"})`;
    const bestAverageAll = rankAll(
      avgByUser.map((a) => ({ userId: a.userId, value: a.avg, detail: avgDetail(a) }))
    );
    const worstAverageAll = rankAll(
      avgByUser.map((a) => ({ userId: a.userId, value: -a.avg, detail: avgDetail(a) }))
    );

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
    const stdevDetail = (s: { stdev: number; rounds: number }) => `±${s.stdev.toFixed(1)} (${s.rounds} rounds)`;
    const mostConsistentAll = rankAll(
      stdevByUser.map((s) => ({ userId: s.userId, value: s.stdev, detail: stdevDetail(s) }))
    );
    const leastConsistentAll = rankAll(
      stdevByUser.map((s) => ({ userId: s.userId, value: -s.stdev, detail: stdevDetail(s) }))
    );

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
    const deltaDetail = (d: { delta: number; prevAvg: number; thisAvg: number }) =>
      `${formatSigned(d.delta)} (${d.prevAvg.toFixed(1)} → ${d.thisAvg.toFixed(1)})`;
    const mostImprovedAll = rankAll(
      deltas.map((d) => ({ userId: d.userId, value: d.delta, detail: deltaDetail(d) }))
    );
    const leastImprovedAll = rankAll(
      deltas.map((d) => ({ userId: d.userId, value: -d.delta, detail: deltaDetail(d) }))
    );

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
    const leastMulligansAll = rankAll(
      data.mulligans.map((m) => ({ userId: m.userId, value: m.total, detail: `${m.total}` }))
    );
    const mostMulligansAll = rankAll(
      data.mulligans.map((m) => ({ userId: m.userId, value: -m.total, detail: `${m.total}` }))
    );

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
    const leastAcesAll = rankAll(
      aceRoster.map((a) => ({ userId: a.userId, value: a.total, detail: `${a.total}` }))
    );
    const mostAcesAll = rankAll(
      aceRoster.map((a) => ({ userId: a.userId, value: -a.total, detail: `${a.total}` }))
    );

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
    const leastFreeGamesAll = rankAll(
      data.freeGames.map((f) => ({ userId: f.userId, value: f.total, detail: `${f.total}` }))
    );
    const mostFreeGamesAll = rankAll(
      data.freeGames.map((f) => ({ userId: f.userId, value: -f.total, detail: `${f.total}` }))
    );

    // "Tournament round" = a complete round where the player took zero mulligans.
    const mulligansByRoundUser = new Map<string, number>();
    for (const rm of data.roundMulligans) {
      mulligansByRoundUser.set(`${rm.roundId}|${rm.userId}`, rm.mulligans);
    }
    const tournamentEntries = allTotals.filter(
      (r) => (mulligansByRoundUser.get(`${r.roundId}|${r.userId}`) ?? 0) === 0
    );
    const tournamentCountByUser = new Map<string, number>();
    for (const t of tournamentEntries) {
      tournamentCountByUser.set(t.userId, (tournamentCountByUser.get(t.userId) ?? 0) + 1);
    }
    const tournamentRateByUser: { userId: string; pct: number; played: number; rounds: number }[] = [];
    for (const [userId, rounds] of totalsByUser) {
      const played = tournamentCountByUser.get(userId) ?? 0;
      tournamentRateByUser.push({ userId, pct: (played / rounds.length) * 100, played, rounds: rounds.length });
    }
    const minRate = tournamentRateByUser.length
      ? Math.min(...tournamentRateByUser.map((r) => r.pct))
      : null;
    const maxRate = tournamentRateByUser.length
      ? Math.max(...tournamentRateByUser.map((r) => r.pct))
      : null;
    const lowestTournamentRate =
      minRate == null ? [] : tournamentRateByUser.filter((r) => Math.abs(r.pct - minRate) < 1e-9);
    const highestTournamentRate =
      maxRate == null ? [] : tournamentRateByUser.filter((r) => Math.abs(r.pct - maxRate) < 1e-9);
    const rateDetail = (r: { pct: number; played: number; rounds: number }) =>
      `${r.pct.toFixed(0)}% (${r.played}/${r.rounds})`;
    const highestTournamentRateAll = rankAll(
      tournamentRateByUser.map((r) => ({ userId: r.userId, value: -r.pct, detail: rateDetail(r) }))
    );
    const lowestTournamentRateAll = rankAll(
      tournamentRateByUser.map((r) => ({ userId: r.userId, value: r.pct, detail: rateDetail(r) }))
    );

    const bestTournamentTotal = tournamentEntries.length
      ? Math.min(...tournamentEntries.map((r) => r.total))
      : null;
    const worstTournamentTotal = tournamentEntries.length
      ? Math.max(...tournamentEntries.map((r) => r.total))
      : null;
    const bestTournamentEntries =
      bestTournamentTotal == null
        ? []
        : tournamentEntries.filter((r) => r.total === bestTournamentTotal);
    const worstTournamentEntries =
      worstTournamentTotal == null
        ? []
        : tournamentEntries.filter((r) => r.total === worstTournamentTotal);
    const bestTournamentAll = rankAll(
      tournamentEntries.map((r) => ({
        userId: r.userId,
        value: r.total,
        detail: `${r.total} — ${r.datePlayed}`,
      }))
    );
    const worstTournamentAll = rankAll(
      tournamentEntries.map((r) => ({
        userId: r.userId,
        value: -r.total,
        detail: `${r.total} — ${r.datePlayed}`,
      }))
    );

    return {
      bestEntries,
      worstEntries,
      bestScoreAll,
      worstScoreAll,
      bestAverage,
      worstAverage,
      bestAverageAll,
      worstAverageAll,
      mostConsistent,
      leastConsistent,
      mostConsistentAll,
      leastConsistentAll,
      mostImproved,
      leastImproved,
      mostImprovedAll,
      leastImprovedAll,
      leastMulligans,
      mostMulligans,
      leastMulligansAll,
      mostMulligansAll,
      leastAces,
      mostAces,
      leastAcesAll,
      mostAcesAll,
      leastFreeGames,
      mostFreeGames,
      leastFreeGamesAll,
      mostFreeGamesAll,
      highestTournamentRate,
      lowestTournamentRate,
      highestTournamentRateAll,
      lowestTournamentRateAll,
      bestTournamentEntries,
      worstTournamentEntries,
      bestTournamentAll,
      worstTournamentAll,
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
                all={awards.bestScoreAll}
                playerLabel={playerLabel}
                emptyText="No complete rounds this year."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Worst score of the year"
                description="Highest single-round total"
                winners={awards.worstEntries.map((r) => ({
                  userId: r.userId,
                  detail: `${r.total} — ${r.datePlayed}`,
                }))}
                all={awards.worstScoreAll}
                playerLabel={playerLabel}
                emptyText="No complete rounds this year."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Best average score"
                description="Lowest average round total"
                winners={awards.bestAverage.map((a) => ({
                  userId: a.userId,
                  detail: `${a.avg.toFixed(1)} (${a.rounds} round${a.rounds === 1 ? "" : "s"})`,
                }))}
                all={awards.bestAverageAll}
                playerLabel={playerLabel}
                emptyText="No complete rounds this year."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Worst average score"
                description="Highest average round total"
                winners={awards.worstAverage.map((a) => ({
                  userId: a.userId,
                  detail: `${a.avg.toFixed(1)} (${a.rounds} round${a.rounds === 1 ? "" : "s"})`,
                }))}
                all={awards.worstAverageAll}
                playerLabel={playerLabel}
                emptyText="No complete rounds this year."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Most consistent"
                description="Least round-to-round deviation (min. 2 rounds)"
                winners={awards.mostConsistent.map((s) => ({
                  userId: s.userId,
                  detail: `±${s.stdev.toFixed(1)} (${s.rounds} rounds)`,
                }))}
                all={awards.mostConsistentAll}
                playerLabel={playerLabel}
                emptyText="Not enough rounds yet."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Least consistent"
                description="Most round-to-round deviation (min. 2 rounds)"
                winners={awards.leastConsistent.map((s) => ({
                  userId: s.userId,
                  detail: `±${s.stdev.toFixed(1)} (${s.rounds} rounds)`,
                }))}
                all={awards.leastConsistentAll}
                playerLabel={playerLabel}
                emptyText="Not enough rounds yet."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Most improved"
                description="Average total dropped the most vs. previous year"
                winners={awards.mostImproved.map((d) => ({
                  userId: d.userId,
                  detail: `${d.delta.toFixed(1)} (${d.prevAvg.toFixed(1)} → ${d.thisAvg.toFixed(1)})`,
                }))}
                all={awards.mostImprovedAll}
                playerLabel={playerLabel}
                emptyText="No players with rounds in both this year and the previous one."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Least improved"
                description="Average total rose the most vs. previous year"
                winners={awards.leastImproved.map((d) => ({
                  userId: d.userId,
                  detail: `+${d.delta.toFixed(1)} (${d.prevAvg.toFixed(1)} → ${d.thisAvg.toFixed(1)})`,
                }))}
                all={awards.leastImprovedAll}
                playerLabel={playerLabel}
                emptyText="No players with rounds in both this year and the previous one."
                onExpand={setModalPayload}
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
                all={mulligansTracked ? awards.leastMulligansAll : []}
                playerLabel={playerLabel}
                emptyText={
                  mulligansTracked
                    ? "No data yet."
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}.`
                }
                onExpand={setModalPayload}
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
                all={mulligansTracked ? awards.mostMulligansAll : []}
                playerLabel={playerLabel}
                emptyText={
                  mulligansTracked
                    ? "No data yet."
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}.`
                }
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Highest tournament rate"
                description={
                  mulligansTracked
                    ? "Highest % of rounds played with no mulligans"
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}`
                }
                winners={
                  mulligansTracked
                    ? awards.highestTournamentRate.map((r) => ({
                        userId: r.userId,
                        detail: `${r.pct.toFixed(0)}% (${r.played}/${r.rounds})`,
                      }))
                    : []
                }
                all={mulligansTracked ? awards.highestTournamentRateAll : []}
                playerLabel={playerLabel}
                emptyText={
                  mulligansTracked
                    ? "No data yet."
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}.`
                }
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Lowest tournament rate"
                description={
                  mulligansTracked
                    ? "Lowest % of rounds played with no mulligans"
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}`
                }
                winners={
                  mulligansTracked
                    ? awards.lowestTournamentRate.map((r) => ({
                        userId: r.userId,
                        detail: `${r.pct.toFixed(0)}% (${r.played}/${r.rounds})`,
                      }))
                    : []
                }
                all={mulligansTracked ? awards.lowestTournamentRateAll : []}
                playerLabel={playerLabel}
                emptyText={
                  mulligansTracked
                    ? "No data yet."
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}.`
                }
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Best tournament round"
                description={
                  mulligansTracked
                    ? "Lowest single-round total among mulligan-free rounds"
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}`
                }
                winners={
                  mulligansTracked
                    ? awards.bestTournamentEntries.map((r) => ({
                        userId: r.userId,
                        detail: `${r.total} — ${r.datePlayed}`,
                      }))
                    : []
                }
                all={mulligansTracked ? awards.bestTournamentAll : []}
                playerLabel={playerLabel}
                emptyText={
                  mulligansTracked
                    ? "No mulligan-free rounds this year."
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}.`
                }
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Worst tournament round"
                description={
                  mulligansTracked
                    ? "Highest single-round total among mulligan-free rounds"
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}`
                }
                winners={
                  mulligansTracked
                    ? awards.worstTournamentEntries.map((r) => ({
                        userId: r.userId,
                        detail: `${r.total} — ${r.datePlayed}`,
                      }))
                    : []
                }
                all={mulligansTracked ? awards.worstTournamentAll : []}
                playerLabel={playerLabel}
                emptyText={
                  mulligansTracked
                    ? "No mulligan-free rounds this year."
                    : `Mulligans weren't tracked before ${FIRST_MULLIGAN_YEAR}.`
                }
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Most holes-in-one"
                description="Total aces this year"
                winners={awards.mostAces.map((a) => ({ userId: a.userId, detail: `${a.total}` }))}
                all={awards.mostAcesAll}
                playerLabel={playerLabel}
                emptyText="No holes-in-one this year."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Fewest holes-in-one"
                description="Among players with a scored round this year"
                winners={awards.leastAces.map((a) => ({ userId: a.userId, detail: `${a.total}` }))}
                all={awards.leastAcesAll}
                playerLabel={playerLabel}
                emptyText="No data yet."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Most free games scored"
                description="Total free games this year"
                winners={awards.mostFreeGames.map((f) => ({
                  userId: f.userId,
                  detail: `${f.total}`,
                }))}
                all={awards.mostFreeGamesAll}
                playerLabel={playerLabel}
                emptyText="No free games scored this year."
                onExpand={setModalPayload}
              />
              <AwardCard
                title="Fewest free games scored"
                description="Among players with a scored round this year"
                winners={awards.leastFreeGames.map((f) => ({
                  userId: f.userId,
                  detail: `${f.total}`,
                }))}
                all={awards.leastFreeGamesAll}
                playerLabel={playerLabel}
                emptyText="No data yet."
                onExpand={setModalPayload}
              />
            </div>
          )}
        </>
      )}
      {modalPayload && (
        <AwardModal
          payload={modalPayload}
          onClose={() => setModalPayload(null)}
          playerLabel={playerLabel}
        />
      )}
    </div>
  );
}
