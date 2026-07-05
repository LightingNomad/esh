export interface HoleFormInput {
  holeNumber: number;
  par: number;
  tipsAndTricksNotes: string;
  name: string;
  isFreeGameHole: boolean;
}

export function defaultHoles(count: number): HoleFormInput[] {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 3,
    tipsAndTricksNotes: "",
    name: "",
    isFreeGameHole: false,
  }));
}

export default function HoleEditorFields({
  holes,
  onUpdateHole,
  onSetFreeGameHole,
  onClearFreeGameHole,
}: {
  holes: HoleFormInput[];
  onUpdateHole: (index: number, patch: Partial<HoleFormInput>) => void;
  onSetFreeGameHole: (index: number) => void;
  onClearFreeGameHole: () => void;
}) {
  const hasFreeGameHole = holes.some((h) => h.isFreeGameHole);

  return (
    <div className="space-y-2">
      {hasFreeGameHole && (
        <button
          type="button"
          onClick={onClearFreeGameHole}
          className="text-xs text-black/50 underline"
        >
          Clear Free Game hole
        </button>
      )}
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {holes.map((hole, i) => (
        <div key={hole.holeNumber} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-14 shrink-0">Hole {hole.holeNumber}</span>
          <input
            type="text"
            placeholder="Name (optional)"
            value={hole.name}
            onChange={(e) => onUpdateHole(i, { name: e.target.value })}
            className="w-32 rounded border border-black/20 px-2 py-1"
          />
          <input
            type="number"
            min={1}
            value={hole.par}
            onChange={(e) => onUpdateHole(i, { par: Number(e.target.value) })}
            className="w-16 rounded border border-black/20 px-2 py-1"
            title="Par"
          />
          <input
            type="text"
            placeholder="Tips & tricks"
            value={hole.tipsAndTricksNotes}
            onChange={(e) => onUpdateHole(i, { tipsAndTricksNotes: e.target.value })}
            className="min-w-[8rem] flex-1 rounded border border-black/20 px-2 py-1"
          />
          <label className="flex items-center gap-1 whitespace-nowrap">
            <input
              type="radio"
              name="free-game-hole"
              checked={hole.isFreeGameHole}
              onChange={() => onSetFreeGameHole(i)}
            />
            Free Game
          </label>
        </div>
        ))}
      </div>
    </div>
  );
}
