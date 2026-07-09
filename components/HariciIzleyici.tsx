"use client";

import { memo, useEffect, useState } from "react";

export type EklentiDurumu = "yok" | "var" | "bagli";

interface Props {
  url: string;
  /** Bilinen yayın servisi adı (Netflix vb.) ya da null. Doluysa iframe denenmez. */
  servis: string | null;
  oynuyor: boolean;
  /** Duraklamada geçen saniye; oynuyorsa `ts` anındaki başlangıç değeri. */
  taban: number;
  /** Oynatma başladığı an (Date.now() ms). */
  ts: number;
  /** Oda kilitli ve ben sahip değilim: başlat/durdur gizlenir. */
  kilitli: boolean;
  /** Rve tarayıcı eklentisi bu sekmede algılandı mı / odaya bağlı mı. */
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

function HariciIzleyici({
  url,
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
  const [saat, setSaat] = useState(() =>
    bicimle(oynuyor ? taban + (Date.now() - ts) / 1000 : taban)
  );

  useEffect(() => {
    setSaat(bicimle(oynuyor ? taban + (Date.now() - ts) / 1000 : taban));
    if (!oynuyor) return;
    const zaman = setInterval(
      () => setSaat(bicimle(taban + (Date.now() - ts) / 1000)),
      500
    );
    return () => clearInterval(zaman);
  }, [oynuyor, taban, ts]);

  // İnce, tek satırlık üst toolbar: rozet · url · sayaç · Başlat · Durdur · Aç
  const arac = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-cizgi bg-koltuk px-3 py-1.5">
      {servis && (
        <span className="shrink-0 rounded-md bg-amber/15 px-2 py-0.5 font-display text-[11px] font-semibold text-amber">
          {servis}
        </span>
      )}
      <span className="order-last w-full min-w-0 truncate text-[11px] text-soluk sm:order-none sm:w-auto sm:flex-1">
        {url}
      </span>
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
      {eklenti === "yok" && (
        <a
          href="/eklenti"
          target="_blank"
          rel="noopener"
          title="Ücretsiz tarayıcı eklentisiyle oynat/duraklat/sar otomatik senkronlanır — kurulum 1-2 dk"
          className="shrink-0 rounded-lg border border-dashed border-cizgi px-2.5 py-1 text-xs text-soluk transition hover:border-amber/60 hover:text-amber"
        >
          🧩 Eklenti kur
        </a>
      )}
      {eklenti !== "yok" && (
        <button
          onClick={onEklentiBaglan}
          disabled={eklenti === "bagli"}
          title={
            eklenti === "bagli"
              ? "Rve eklentisi bu odaya bağlı — sekmelerdeki video otomatik senkronlanır"
              : "Rve eklentisini bu odaya bağla: izlediğin sekmedeki video otomatik senkronlanır"
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
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg border border-cizgi px-2.5 py-1 text-xs font-medium text-isik transition hover:border-amber/60 hover:text-amber"
      >
        Sekmede aç ↗
      </a>
    </div>
  );

  // Netflix vb. gömülemeyen servis: iframe deneme, kısa bir yönerge göster.
  if (servis) {
    return (
      <div className="flex h-full w-full flex-col">
        {arac}
        <div className="huzme flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="text-3xl">🍿</span>
          <p className="max-w-xs text-sm text-soluk">
            <b className="text-isik">{servis}</b> gömülemez — herkes{" "}
            <b className="text-isik">“Sekmede aç”</b> ile kendi hesabında açsın,
            üstteki <b className="text-isik">▶ 3-2-1</b> ile birlikte başlayın.
          </p>
        </div>
      </div>
    );
  }

  // Bilinmeyen harici site: gömmeyi dene (izin veriyorsa oynar).
  return (
    <div className="flex h-full w-full flex-col">
      {arac}
      <iframe
        src={url}
        className="w-full flex-1 bg-black"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// iframe/kart'ın sohbet güncellemelerinde yeniden render edilmesini önler.
export default memo(HariciIzleyici);
