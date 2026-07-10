"use client";

import { memo, useEffect, useState } from "react";
import type { EklentiDurumu, VideoTipi } from "@/lib/types";

interface Props {
  url: string;
  videoTipi: VideoTipi;
  /** Bilinen yayın servisi adı (Netflix vb.) ya da null. */
  servis: string | null;
  /** Harici mod ortak saati (YouTube modunda kullanılmaz). */
  oynuyor: boolean;
  taban: number;
  ts: number;
  /** Oda kilitli ve ben sahip değilim: başlat/durdur gizlenir. */
  kilitli: boolean;
  eklenti: EklentiDurumu;
  onEklentiBaglan: () => void;
  onGeriSayim: () => void;
  onDurdur: () => void;
}

function bicimle(saniye: number): string {
  const s = Math.max(0, Math.floor(saniye));
  const sa = Math.floor(s / 3600);
  const dk = Math.floor((s % 3600) / 60);
  const sn = s % 60;
  const iki = (n: number) => String(n).padStart(2, "0");
  return sa > 0 ? `${sa}:${iki(dk)}:${iki(sn)}` : `${iki(dk)}:${iki(sn)}`;
}

/** Her video modunda (YouTube / Netflix / harici web) aynı görünen üst panel:
 *  rozet · adres · (haricide) senkron saati + 3-2-1/Durdur · eklenti durumu. */
function FilmPaneli({
  url,
  videoTipi,
  servis,
  oynuyor,
  taban,
  ts,
  kilitli,
  eklenti,
  onEklentiBaglan,
  onGeriSayim,
  onDurdur,
}: Props) {
  const guvenliUrl = /^https?:\/\//i.test(url);
  const harici = videoTipi === "external";
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

  const [saat, setSaat] = useState(() =>
    bicimle(oynuyor ? taban + (Date.now() - ts) / 1000 : taban)
  );
  useEffect(() => {
    if (!harici) return;
    setSaat(bicimle(oynuyor ? taban + (Date.now() - ts) / 1000 : taban));
    if (!oynuyor) return;
    const zaman = setInterval(
      () => setSaat(bicimle(taban + (Date.now() - ts) / 1000)),
      500
    );
    return () => clearInterval(zaman);
  }, [harici, oynuyor, taban, ts]);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-cizgi bg-koltuk px-3 py-1.5">
      <span className="shrink-0 rounded-md bg-amber/15 px-2 py-0.5 font-display text-[11px] font-semibold text-amber">
        {rozet}
      </span>
      <span className="order-last w-full min-w-0 truncate text-[11px] text-soluk sm:order-none sm:w-auto sm:flex-1">
        {url}
      </span>
      {harici && (
        <>
          <span className="flex shrink-0 items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${oynuyor ? "bg-amber" : "bg-soluk/50"}`}
            />
            <span
              className={`text-sm font-semibold tabular-nums ${oynuyor ? "text-amber" : "text-isik"}`}
            >
              {saat}
            </span>
          </span>
          {kilitli ? (
            <span
              className="shrink-0 rounded-md bg-kadife px-2 py-0.5 text-[11px] text-soluk"
              title="Oda kilitli — başlat/durdur sadece oda sahibinde"
            >
              🔒 Kontroller sahipte
            </span>
          ) : (
            <>
              <button
                onClick={onGeriSayim}
                title="Herkeste 3-2-1 sayacıyla başlat / devam ettir"
                className="shrink-0 rounded-lg bg-amber px-2.5 py-1 text-xs font-bold text-perde transition hover:brightness-110 active:scale-95"
              >
                ▶ 3-2-1
              </button>
              <button
                onClick={onDurdur}
                title="Herkeste durdur"
                className="shrink-0 rounded-lg border border-cizgi px-2.5 py-1 text-xs font-semibold text-isik transition hover:border-amber/60 hover:text-amber active:scale-95"
              >
                ⏸ Durdur
              </button>
            </>
          )}
        </>
      )}
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
          onClick={onEklentiBaglan}
          disabled={eklenti === "bagli"}
          title={
            eklenti === "bagli"
              ? "Rve eklentisi bu odaya bağlı — sekmelerdeki video otomatik senkronlanır"
              : "Eklenti kurulu ama bağlı değil — tıkla, oda kodu otomatik girilir ve bağlanır"
          }
          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
            eklenti === "bagli"
              ? "border border-canli/50 text-canli"
              : "border border-amber/60 text-amber hover:bg-amber/10 active:scale-95"
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
