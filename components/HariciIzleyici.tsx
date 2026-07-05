"use client";

import { memo, useEffect, useState } from "react";

interface Props {
  url: string;
  /** Bilinen yayın servisi adı (Netflix vb.) ya da null. Doluysa iframe denenmez. */
  servis: string | null;
  oynuyor: boolean;
  /** Duraklamada geçen saniye; oynuyorsa `ts` anındaki başlangıç değeri. */
  taban: number;
  /** Oynatma başladığı an (Date.now() ms). */
  ts: number;
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
  onGeriSayim,
  onDurdur,
}: Props) {
  const gecen = () => (oynuyor ? taban + (Date.now() - ts) / 1000 : taban);
  const [saat, setSaat] = useState(() => bicimle(gecen()));

  useEffect(() => {
    setSaat(bicimle(oynuyor ? taban + (Date.now() - ts) / 1000 : taban));
    if (!oynuyor) return;
    const zaman = setInterval(
      () => setSaat(bicimle(taban + (Date.now() - ts) / 1000)),
      500
    );
    return () => clearInterval(zaman);
  }, [oynuyor, taban, ts]);

  const kontroller = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`rakam font-display text-5xl font-bold tabular-nums sm:text-6xl ${
          oynuyor ? "text-amber" : "text-isik"
        }`}
      >
        {saat}
      </div>
      <span className="text-xs tracking-wide text-soluk">
        {oynuyor ? "▶ Oynuyor — herkeste senkron" : "⏸ Duraklatıldı"}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onGeriSayim}
          className="rounded-lg bg-amber px-4 py-2 text-sm font-bold text-perde transition hover:brightness-110 active:scale-95"
        >
          ▶ Başlat / Devam (3-2-1)
        </button>
        <button
          onClick={onDurdur}
          className="rounded-lg border border-cizgi px-4 py-2 text-sm font-semibold text-isik transition hover:border-amber/60 hover:text-amber active:scale-95"
        >
          ⏸ Durdur
        </button>
      </div>
    </div>
  );

  const ustSerit = (
    <div className="flex items-center gap-2 border-b border-cizgi bg-koltuk px-3 py-2">
      {servis && (
        <span className="shrink-0 rounded-md bg-amber/15 px-2 py-1 font-display text-[11px] font-semibold text-amber">
          {servis}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-xs text-soluk">{url}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg border border-cizgi px-3 py-1.5 text-xs font-medium text-isik transition hover:border-amber/60 hover:text-amber"
      >
        Yeni sekmede aç ↗
      </a>
    </div>
  );

  // Netflix vb. gömülemeyen servis: iframe deneme, düzgün ortak-izleme kartı göster.
  if (servis) {
    return (
      <div className="flex h-full w-full flex-col">
        {ustSerit}
        <div className="huzme flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">🍿</span>
            <p className="font-display text-xl font-semibold">
              {servis} kendi hesabınla açılır
            </p>
            <p className="max-w-md text-sm text-soluk">
              {servis} kopya korumalı olduğu için buraya gömülemez.{" "}
              <b className="text-isik">Herkes “Yeni sekmede aç” ile aynı içeriği</b>{" "}
              kendi hesabında açsın; aşağıdaki kontroller herkeste aynı anda
              çalışır.
            </p>
          </div>
          {kontroller}
          <p className="max-w-md text-[11px] leading-relaxed text-soluk/80">
            İpucu: Görüntün kayarsa, üstteki sayaç kaç dakikada olduğunuzu
            gösterir — kendi sekmende o saniyeye sar, tekrar senkron olursun.
          </p>
        </div>
      </div>
    );
  }

  // Bilinmeyen harici site: gömmeyi dene (izin veriyorsa oynar) + altta kontrol şeridi.
  return (
    <div className="flex h-full w-full flex-col">
      {ustSerit}
      <iframe
        src={url}
        className="w-full flex-1 bg-black"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
      <div className="flex flex-col items-center gap-2 border-t border-cizgi bg-koltuk px-3 py-2.5">
        {kontroller}
        <p className="max-w-md text-center text-[11px] leading-relaxed text-soluk/80">
          Yukarısı boşsa site gömülmeye izin vermiyordur: herkes “Yeni sekmede
          aç” ile gitsin, kontrolleri birlikte kullanın; sayaç herkeste ne
          zamanda olduğunuzu gösterir.
        </p>
      </div>
    </div>
  );
}

// iframe/kart'ın sohbet-tepki güncellemelerinde yeniden render edilmesini önler.
export default memo(HariciIzleyici);
