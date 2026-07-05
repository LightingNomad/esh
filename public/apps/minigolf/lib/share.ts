export interface PlayerTotal {
  label: string;
  total: number;
}

export function buildShareText(datePlayed: string, playerTotals: PlayerTotal[]): string {
  const lines = playerTotals.map((p) => `${p.label}: ${p.total}`);
  return `Mini Golf ${datePlayed} Score Update ⛳️:\n${lines.join("\n")}`;
}
