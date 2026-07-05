"use client";

import { useEffect, useRef, useState } from "react";
import type { Mesaj } from "@/lib/types";

interface Props {
  mesajlar: Mesaj[];
  benimAdim: string;
  onGonder: (metin: string) => void;
}

function adRengi(ad: string): string {
  let h = 0;
  for (const karakter of ad) h = (h * 31 + karakter.charCodeAt(0)) % 360;
  return `hsl(${h} 65% 72%)`;
}

function saat(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Sohbet({ mesajlar, benimAdim, onGonder }: Props) {
  const [metin, setMetin] = useState("");
  const listeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const liste = listeRef.current;
    if (liste) liste.scrollTop = liste.scrollHeight;
  }, [mesajlar.length]);

  function gonder() {
    const temiz = metin.trim();
    if (!temiz) return;
    onGonder(temiz);
    setMetin("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listeRef}
        className="ince-kaydirma min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
      >
        {mesajlar.length === 0 && (
          <p className="pt-6 text-center text-xs text-soluk">
            Henüz mesaj yok. İlk lafı sen at! 🍿
          </p>
        )}
        {mesajlar.map((mesaj) =>
          mesaj.sistem ? (
            <p
              key={mesaj.id}
              className="text-center text-[11px] italic text-soluk"
            >
              {mesaj.content}
            </p>
          ) : (
          <div key={mesaj.id} className="text-sm leading-snug">
            <span
              className="font-semibold"
              style={{
                color:
                  mesaj.nickname === benimAdim
                    ? "var(--color-amber)"
                    : adRengi(mesaj.nickname),
              }}
            >
              {mesaj.nickname}
            </span>
            <span className="ml-2 text-[10px] text-soluk">
              {saat(mesaj.created_at)}
            </span>
            <p className="break-words text-isik/90">{mesaj.content}</p>
          </div>
          )
        )}
      </div>
      <div className="flex gap-2 border-t border-cizgi p-3">
        <input
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && gonder()}
          placeholder="Mesaj yaz…"
          maxLength={500}
          className="min-w-0 flex-1 rounded-lg border border-cizgi bg-perde px-3 py-2 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60"
        />
        <button
          onClick={gonder}
          className="rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-perde transition hover:brightness-110"
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
