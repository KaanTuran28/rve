"use client";

import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from "react";
import type { OynaticiKontrol, SenkronOlay } from "@/lib/types";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface Props {
  videoId: string;
  baslangicSaniye: number;
  onYerelOlay: (olay: SenkronOlay) => void;
  /** Video sonuna gelince (kuyruktan sıradakine geçmek için). */
  onBitti?: () => void;
}

let apiSozu: Promise<void> | null = null;

function youtubeApiYukle(): Promise<void> {
  if (typeof window !== "undefined" && window.YT?.Player) {
    return Promise.resolve();
  }
  if (!apiSozu) {
    apiSozu = new Promise((resolve) => {
      const onceki = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        onceki?.();
        resolve();
      };
      const betik = document.createElement("script");
      betik.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(betik);
    });
  }
  return apiSozu;
}

const YouTubeOynatici = forwardRef<OynaticiKontrol, Props>(
  function YouTubeOynatici({ videoId, baslangicSaniye, onYerelOlay, onBitti }, ref) {
    const kapRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oynaticiRef = useRef<any>(null);
    const hazirRef = useRef(false);
    // Uzaktan gelen komutların tetiklediği durum değişimlerini geri yayınlamamak
    // için bu zamana kadarki onStateChange olayları yok sayılır.
    const uzaktanKadarRef = useRef(0);
    const olayRef = useRef(onYerelOlay);
    olayRef.current = onYerelOlay;
    const bittiRef = useRef(onBitti);
    bittiRef.current = onBitti;

    useEffect(() => {
      let iptal = false;
      youtubeApiYukle().then(() => {
        if (iptal || !kapRef.current) return;
        oynaticiRef.current = new window.YT.Player(kapRef.current, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            playsinline: 1,
            rel: 0,
            start: Math.max(0, Math.floor(baslangicSaniye)),
          },
          events: {
            onReady: () => {
              hazirRef.current = true;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStateChange: (olay: any) => {
              if (Date.now() < uzaktanKadarRef.current) return;
              const Durum = window.YT.PlayerState;
              const saniye = oynaticiRef.current?.getCurrentTime?.() ?? 0;
              if (olay.data === Durum.PLAYING) {
                olayRef.current({ tur: "oynat", saniye });
              } else if (olay.data === Durum.PAUSED) {
                olayRef.current({ tur: "duraklat", saniye });
              } else if (olay.data === Durum.ENDED) {
                bittiRef.current?.();
              }
            },
          },
        });
      });
      return () => {
        iptal = true;
        hazirRef.current = false;
        oynaticiRef.current?.destroy?.();
        oynaticiRef.current = null;
      };
      // Oynatıcı bir kez kurulur; video değişimi ayrı efektte loadVideoById ile.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (hazirRef.current && oynaticiRef.current?.loadVideoById) {
        uzaktanKadarRef.current = Date.now() + 2000;
        oynaticiRef.current.loadVideoById(videoId);
      }
    }, [videoId]);

    useImperativeHandle(ref, () => ({
      oynat(saniye) {
        const o = oynaticiRef.current;
        if (!o?.playVideo) return;
        uzaktanKadarRef.current = Date.now() + 1500;
        if (
          saniye != null &&
          Math.abs((o.getCurrentTime?.() ?? 0) - saniye) > 1.5
        ) {
          o.seekTo(saniye, true);
        }
        o.playVideo();
      },
      duraklat(saniye) {
        const o = oynaticiRef.current;
        if (!o?.pauseVideo) return;
        uzaktanKadarRef.current = Date.now() + 1500;
        o.pauseVideo();
        if (saniye != null) o.seekTo(saniye, true);
      },
    }));

    return (
      <div className="h-full w-full bg-black">
        <div ref={kapRef} className="h-full w-full" />
      </div>
    );
  }
);

// Sohbet/tepki state değişimlerinde oynatıcının yeniden render edilmesini önler.
export default memo(YouTubeOynatici);
