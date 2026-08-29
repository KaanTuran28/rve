"use client";

import { useEffect, useRef } from "react";

interface Props {
  benimKimlik: string;
  /** Ekranını paylaşan kişinin presence kimliği (video_type "ekran" iken hep dolu). */
  paylasan: string | null;
  paylasanAdi: string | null;
  /** İzleyicideyken WebRTC'den gelen canlı akış; sahibindeyken kullanılmaz. */
  akis: MediaStream | null;
  onDurdur: () => void;
}

export default function EkranPaylasimi({
  benimKimlik,
  paylasan,
  paylasanAdi,
  akis,
  onDurdur,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = akis;
  }, [akis]);

  if (paylasan === benimKimlik) {
    return (
      <div className="huzme flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="text-4xl">🖥️</span>
        <p className="font-display text-xl font-semibold">
          Ekranını paylaşıyorsun
        </p>
        <p className="max-w-sm text-sm text-soluk">
          Odadaki herkes ekranını canlı izliyor.
        </p>
        <button
          onClick={onDurdur}
          className="rounded-lg bg-amber px-4 py-2 text-sm font-bold text-perde transition hover:brightness-110 active:scale-95"
        >
          Paylaşımı durdur
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-contain"
      />
      {paylasanAdi && (
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-perde/80 px-2.5 py-1 text-xs text-isik shadow-lg backdrop-blur-sm">
          🖥️ {paylasanAdi}&apos;nın ekranı
        </span>
      )}
      {!akis && (
        <div className="huzme absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <span className="text-3xl">🖥️</span>
          <p className="text-sm text-soluk">Bağlanıyor…</p>
        </div>
      )}
    </div>
  );
}
