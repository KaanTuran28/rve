"use client";

import { memo } from "react";
import type { EklentiDurumu, VideoTipi } from "@/lib/types";

interface Props {
  url: string;
  videoTipi: VideoTipi;
  /** Bilinen yayın servisi adı (Netflix vb.) ya da null. */
  servis: string | null;
  eklenti: EklentiDurumu;
  onEklentiBaglan: () => void;
  /** Bağlıyken çipe tekrar basınca bağlantıyı keser. */
  onEklentiKapat: () => void;
}

/** Her video modunda (YouTube / Netflix / harici web) aynı görünen üst panel:
 *  rozet · adres · eklenti durumu · sekmede aç. */
function FilmPaneli({
  url,
  videoTipi,
  servis,
  eklenti,
  onEklentiBaglan,
  onEklentiKapat,
}: Props) {
  const guvenliUrl = /^https?:\/\//i.test(url);
  let rozet = servis;
  if (!rozet) {
    if (videoTipi === "youtube") rozet = "YouTube";
    else {
      try {
        rozet = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        rozet = "Video";
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-cizgi bg-koltuk px-3 py-1.5">
      <span className="shrink-0 rounded-md bg-amber/15 px-2 py-0.5 font-display text-[11px] font-semibold text-amber">
        {rozet}
      </span>
      <span className="order-last w-full min-w-0 truncate text-[11px] text-soluk sm:order-none sm:w-auto sm:flex-1">
        {url}
      </span>
      {eklenti === "yok" ? (
        <a
          href="/eklenti"
          target="_blank"
          rel="noopener"
          title="Eklenti kurulu değil — kurulum rehberini aç (1-2 dk). Eklentiyle oynat/duraklat/sar her sitede otomatik senkronlanır."
          className="shrink-0 rounded-lg border border-dashed border-cizgi px-2.5 py-1 text-xs text-soluk transition hover:border-amber/60 hover:text-amber"
        >
          🧩 Eklenti yok ✗
        </a>
      ) : (
        <button
          onClick={eklenti === "bagli" ? onEklentiKapat : onEklentiBaglan}
          title={
            eklenti === "bagli"
              ? "Eklenti bu odaya bağlı — bağlantıyı kesmek için tıkla"
              : "Eklenti kurulu ama bağlı değil — tıkla, oda kodu otomatik girilir ve bağlanır"
          }
          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
            eklenti === "bagli"
              ? "border border-canli/50 text-canli hover:bg-canli/10"
              : "border border-amber/60 text-amber hover:bg-amber/10"
          }`}
        >
          {eklenti === "bagli" ? "🧩 Eklenti bağlı ✓" : "🧩 Eklentiye bağla"}
        </button>
      )}
      {guvenliUrl && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-cizgi px-2.5 py-1 text-xs font-medium text-isik transition hover:border-amber/60 hover:text-amber"
        >
          Sekmede aç ↗
        </a>
      )}
    </div>
  );
}

// Sohbet güncellemelerinde yeniden render edilmesin.
export default memo(FilmPaneli);
