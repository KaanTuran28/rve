"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Mesaj } from "@/lib/types";

interface Props {
  mesajlar: Mesaj[];
  benimAdim: string;
  susturuldum: boolean;
  onGonder: (metin: string) => void;
}

interface DocumentPictureInPicture {
  requestWindow(secenekler?: {
    width?: number;
    height?: number;
  }): Promise<Window>;
}

function dpipAl(): DocumentPictureInPicture | null {
  const w = window as unknown as {
    documentPictureInPicture?: DocumentPictureInPicture;
  };
  return w.documentPictureInPicture ?? null;
}

/** "Hep üstte" mini sohbet penceresi (Document Picture-in-Picture).
 *  Sitenin/YouTube'un KENDİ tam ekranında sayfa içine tıklanabilir katman
 *  koymak Chromium'da imkânsız (popover boyanır ama hit-test edilmez) —
 *  ayrı bir her-zaman-üstte pencere ise tam ekranın da üstünde kalır ve
 *  gerçek tıklama alır. Chrome/Edge 116+ masaüstü; desteklenmiyorsa düğme
 *  hiç görünmez. */
export default function YuzenSohbet({
  mesajlar,
  benimAdim,
  susturuldum,
  onGonder,
}: Props) {
  const [destek, setDestek] = useState(false);
  const [pencere, setPencere] = useState<Window | null>(null);
  const [metin, setMetin] = useState("");
  const listeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDestek(!!dpipAl());
  }, []);

  // Oda sayfasından çıkarken pencereyi de kapat
  useEffect(() => {
    return () => {
      try {
        pencere?.close();
      } catch {
        /* zaten kapalı */
      }
    };
  }, [pencere]);

  // Yeni mesajda en alta kay
  useEffect(() => {
    const liste = listeRef.current;
    if (liste) liste.scrollTop = liste.scrollHeight;
  }, [mesajlar, pencere]);

  async function acKapat() {
    if (pencere) {
      pencere.close();
      setPencere(null);
      return;
    }
    const dpip = dpipAl();
    if (!dpip) return;
    try {
      const win = await dpip.requestWindow({ width: 340, height: 330 });
      // Ana sayfanın stillerini (Tailwind dahil) mini pencereye kopyala
      for (const sayfa of Array.from(document.styleSheets)) {
        try {
          if (sayfa.href) {
            const link = win.document.createElement("link");
            link.rel = "stylesheet";
            link.href = sayfa.href;
            win.document.head.appendChild(link);
          } else if (sayfa.ownerNode instanceof HTMLStyleElement) {
            win.document.head.appendChild(sayfa.ownerNode.cloneNode(true));
          }
        } catch {
          /* erişilemeyen stil sayfası — atla */
        }
      }
      win.document.title = "Rve sohbet";
      win.document.documentElement.lang = "tr";
      // Kullanıcı pencereyi ✕ ile kapatınca durumu sıfırla
      win.addEventListener("pagehide", () => setPencere(null));
      setPencere(win);
    } catch {
      /* kullanıcı gesture'ı yoksa/reddedildiyse sessizce vazgeç */
    }
  }

  function gonder() {
    const temiz = metin.trim();
    if (!temiz) return;
    setMetin("");
    onGonder(temiz);
  }

  return (
    <>
      {destek && (
        <button
          onClick={acKapat}
          className={`rounded-lg border px-2 py-1.5 text-xs transition sm:px-3 ${
            pencere
              ? "border-amber/60 text-amber"
              : "border-cizgi text-isik hover:border-amber/60"
          }`}
          title={
            pencere
              ? "Yüzen sohbet penceresini kapat"
              : "Hep üstte mini sohbet penceresi aç — sitenin kendi tam ekranında bile üstte kalır"
          }
        >
          🪟<span className="hidden sm:inline"> Yüzen sohbet</span>
        </button>
      )}
      {pencere &&
        createPortal(
          <div className="flex h-dvh flex-col bg-perde font-sans text-isik">
            <div
              ref={listeRef}
              className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5 text-sm"
            >
              {mesajlar.length === 0 && (
                <p className="pt-4 text-center text-xs text-soluk">
                  Henüz mesaj yok — bu pencere tam ekranda da üstte kalır.
                </p>
              )}
              {mesajlar.slice(-60).map((mesaj) =>
                mesaj.sistem ? (
                  <p
                    key={mesaj.id}
                    className="text-center text-[11px] italic text-soluk"
                  >
                    {mesaj.content}
                  </p>
                ) : (
                  <p key={mesaj.id} className="break-words leading-snug">
                    <span
                      className={`font-semibold ${
                        mesaj.nickname === benimAdim
                          ? "text-amber"
                          : "text-isik/80"
                      }`}
                    >
                      {mesaj.nickname}:
                    </span>{" "}
                    {mesaj.deleted_at ? (
                      <span className="italic text-soluk">
                        🗑 Bu mesaj silindi
                      </span>
                    ) : (
                      <span className="text-isik/90">{mesaj.content}</span>
                    )}
                  </p>
                )
              )}
            </div>
            <div className="flex gap-1.5 border-t border-cizgi p-2">
              <input
                value={metin}
                onChange={(e) => setMetin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && gonder()}
                disabled={susturuldum}
                placeholder={
                  susturuldum ? "🔇 Susturuldun" : "Mesaj yaz…"
                }
                maxLength={500}
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-cizgi bg-koltuk px-2.5 py-1.5 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60 disabled:opacity-60"
              />
              <button
                onClick={gonder}
                disabled={susturuldum}
                className="rounded-lg bg-amber px-3 py-1.5 text-sm font-semibold text-perde transition hover:brightness-110 disabled:opacity-50"
              >
                ➤
              </button>
            </div>
          </div>,
          pencere.document.body
        )}
    </>
  );
}
