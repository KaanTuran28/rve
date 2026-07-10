"use client";

import { useEffect, useRef, useState } from "react";
import type { Mesaj } from "@/lib/types";

interface Props {
  mesajlar: Mesaj[];
  benimAdim: string;
  /** Şu anda mesaj yazan diğer katılımcıların adları. */
  yazanlar: string[];
  /** Oda sahibi beni susturdu: girdi kapalı, mesaj gönderilemez. */
  susturuldum: boolean;
  /** Kullanıcı yazarken çağrılır (üst bileşen throttle'layıp yayınlar). */
  onYaziyor: () => void;
  onGonder: (metin: string) => void;
  /** Kendi mesajını silme/düzenleme. */
  onSil: (id: string) => void;
  onDuzenle: (id: string, metin: string) => void;
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

export default function Sohbet({
  mesajlar,
  benimAdim,
  yazanlar,
  susturuldum,
  onYaziyor,
  onGonder,
  onSil,
  onDuzenle,
}: Props) {
  const [metin, setMetin] = useState("");
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [duzenlemeMetni, setDuzenlemeMetni] = useState("");
  const listeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const liste = listeRef.current;
    if (liste) liste.scrollTop = liste.scrollHeight;
  }, [mesajlar.length]);

  function gonder() {
    const temiz = metin.trim();
    if (!temiz || susturuldum) return;
    onGonder(temiz);
    setMetin("");
  }

  function duzenlemeyiKaydet() {
    const temiz = duzenlemeMetni.trim();
    if (temiz && duzenlenenId) onDuzenle(duzenlenenId, temiz);
    setDuzenlenenId(null);
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
            <div className="flex items-baseline gap-2">
              <span
                className="min-w-0 truncate font-semibold"
                style={{
                  color:
                    mesaj.nickname === benimAdim
                      ? "var(--color-amber)"
                      : adRengi(mesaj.nickname),
                }}
              >
                {mesaj.nickname}
              </span>
              <span className="shrink-0 text-[10px] text-soluk">
                {saat(mesaj.created_at)}
              </span>
              {mesaj.edited_at && (
                <span className="shrink-0 text-[10px] italic text-soluk">
                  (düzenlendi)
                </span>
              )}
              {mesaj.nickname === benimAdim && duzenlenenId !== mesaj.id && (
                <span className="ml-auto flex shrink-0 gap-1">
                  <button
                    onClick={() => {
                      setDuzenlenenId(mesaj.id);
                      setDuzenlemeMetni(mesaj.content);
                    }}
                    title="Mesajı düzenle"
                    className="rounded-md border border-cizgi px-1.5 py-0.5 text-[10px] font-medium text-soluk transition hover:border-amber/60 hover:text-amber active:scale-95"
                  >
                    ✏️ Düzenle
                  </button>
                  <button
                    onClick={() => onSil(mesaj.id)}
                    title="Mesajı sil (herkesten silinir)"
                    className="rounded-md border border-cizgi px-1.5 py-0.5 text-[10px] font-medium text-soluk transition hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-400 active:scale-95"
                  >
                    🗑 Sil
                  </button>
                </span>
              )}
            </div>
            {duzenlenenId === mesaj.id ? (
              <div className="mt-1 flex gap-1.5">
                <input
                  value={duzenlemeMetni}
                  onChange={(e) => setDuzenlemeMetni(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") duzenlemeyiKaydet();
                    if (e.key === "Escape") setDuzenlenenId(null);
                  }}
                  maxLength={500}
                  autoFocus
                  className="min-w-0 flex-1 rounded-md border border-amber/50 bg-perde px-2 py-1 text-sm outline-none"
                />
                <button
                  onClick={duzenlemeyiKaydet}
                  title="Kaydet (Enter)"
                  className="rounded-md bg-amber px-2 text-xs font-semibold text-perde"
                >
                  ✓
                </button>
                <button
                  onClick={() => setDuzenlenenId(null)}
                  title="Vazgeç (Esc)"
                  className="rounded-md border border-cizgi px-2 text-xs text-soluk"
                >
                  ✕
                </button>
              </div>
            ) : (
              <p className="break-words text-isik/90">{mesaj.content}</p>
            )}
          </div>
          )
        )}
      </div>
      {yazanlar.length > 0 && (
        <p className="truncate px-3 pb-1 text-[11px] italic text-soluk">
          ✏️ {yazanlar.join(", ")} yazıyor…
        </p>
      )}
      <div className="flex gap-2 border-t border-cizgi p-3">
        <input
          value={metin}
          onChange={(e) => {
            setMetin(e.target.value);
            if (e.target.value) onYaziyor();
          }}
          onKeyDown={(e) => e.key === "Enter" && gonder()}
          disabled={susturuldum}
          placeholder={
            susturuldum ? "🔇 Oda sahibi seni susturdu" : "Mesaj yaz…"
          }
          maxLength={500}
          className="min-w-0 flex-1 rounded-lg border border-cizgi bg-perde px-3 py-2 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60 disabled:opacity-60"
        />
        <button
          onClick={gonder}
          disabled={susturuldum}
          className="rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-perde transition hover:brightness-110 disabled:opacity-50"
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
