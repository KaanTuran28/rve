"use client";

import { memo } from "react";

interface Props {
  url: string;
  onGeriSayim: () => void;
}

function HariciIzleyici({ url, onGeriSayim }: Props) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-2 border-b border-cizgi bg-koltuk px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs text-soluk">{url}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-cizgi px-3 py-1.5 text-xs font-medium text-isik transition hover:border-amber/60 hover:text-amber"
        >
          Yeni sekmede aç ↗
        </a>
        <button
          onClick={onGeriSayim}
          className="shrink-0 rounded-lg bg-amber px-3 py-1.5 text-xs font-semibold text-perde transition hover:brightness-110"
        >
          3-2-1 Senkron
        </button>
      </div>
      <iframe
        src={url}
        className="w-full flex-1 bg-black"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
      <p className="border-t border-cizgi bg-koltuk px-3 py-1.5 text-[11px] leading-relaxed text-soluk">
        Site yukarıda boş ya da hatalı görünüyorsa gömülmeye izin vermiyordur:
        herkes &quot;Yeni sekmede aç&quot; ile aynı sayfaya gitsin, biri
        &quot;3-2-1 Senkron&quot; başlatsın, sayaç bitince herkes aynı anda
        oynat&apos;a bassın.
      </p>
    </div>
  );
}

// iframe'in sohbet/tepki güncellemelerinde yeniden render edilmesini önler.
export default memo(HariciIzleyici);
