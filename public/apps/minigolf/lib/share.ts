export interface PlayerTotal {
  label: string;
  total: number;
  mulligans?: number;
  freeGame?: boolean;
}

function formatDateMMDDYYYY(datePlayed: string): string {
  const [year, month, day] = datePlayed.split("-");
  if (!year || !month || !day) return datePlayed;
  return `${month}/${day}/${year}`;
}

export function buildShareText(datePlayed: string, playerTotals: PlayerTotal[]): string {
  const lines = playerTotals.map(
    (p) =>
      `${p.label}: ${p.total}${"*".repeat(p.mulligans ?? 0)}${p.freeGame ? "+Free Game" : ""}`
  );
  return `Mini Golf ${formatDateMMDDYYYY(datePlayed)} Score Update ⛳️:\n${lines.join("\n")}`;
}
