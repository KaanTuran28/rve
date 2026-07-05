"use client";

import { memo } from "react";

export interface UcanTepki {
  id: number;
  emoji: string;
  /** yüzde cinsinden yatay konum */
  sol: number;
}

export const TEPKI_EMOJILERI = ["🍿", "❤️", "😂", "😮", "🔥", "👏"];

export const TepkiSeridi = memo(function TepkiSeridi({
  onTepki,
}: {
  onTepki: (emoji: string) => void;
}) {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex gap-0.5 rounded-full border border-cizgi/60 bg-perde/70 px-1.5 py-1 opacity-70 backdrop-blur-sm transition hover:opacity-100">
      {TEPKI_EMOJILERI.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onTepki(emoji)}
          className="rounded-full px-1.5 py-0.5 text-lg leading-none transition hover:scale-125 active:scale-95"
          title="Tepki gönder"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
});

export const TepkiKatmani = memo(function TepkiKatmani({
  tepkiler,
}: {
  tepkiler: UcanTepki[];
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {tepkiler.map((tepki) => (
        <span
          key={tepki.id}
          className="ucan-tepki absolute bottom-4 text-4xl"
          style={{ left: `${tepki.sol}%` }}
        >
          {tepki.emoji}
        </span>
      ))}
    </div>
  );
});
