"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Hole } from "@/lib/types";

export default function HoleInfoPopover({
  hole,
  trigger,
  className,
}: {
  hole: Pick<Hole, "hole_number" | "name" | "par" | "is_free_game_hole">;
  trigger?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const defaultTrigger = hole.is_free_game_hole ? "🎁" : hole.hole_number;

  return (
    <span ref={wrapperRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="underline decoration-dotted underline-offset-2"
      >
        {trigger ?? defaultTrigger}
      </button>
      {open && (
        <span
          className="absolute left-1/2 top-full z-20 mt-1 w-max max-w-[10rem] -translate-x-1/2 rounded border border-black/10 bg-white p-2 text-left text-xs font-normal normal-case text-black shadow-lg"
        >
          <span className="block font-semibold">
            {hole.name ?? `Hole ${hole.hole_number}`}
          </span>
          <span className="block text-black/60">
            {hole.is_free_game_hole ? "Free game hole" : `Par ${hole.par}`}
          </span>
        </span>
      )}
    </span>
  );
}
