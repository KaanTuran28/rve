"use client";

import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
  /** baslangicSaniye'nin hesaplandığı an (Date.now) — yüklenme kayması telafisi. */
  baslangicTs: number;
  /** Sayfa açıldığında oda oynuyorduysa geç katılan için sessiz otomatik başlat. */
  otomatikBaslat: boolean;
  /** Oda kilitli ve sahip değilim: yerel oynat/duraklat anında geri alınır. */
  kilitli: boolean;
  onYerelOlay: (olay: SenkronOlay) => void;
  /** Kilitliyken oynat/duraklat denendiğinde (bildirim göstermek için). */
  onKilitliDeneme?: () => void;
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
  function YouTubeOynatici(
    {
      videoId,
      baslangicSaniye,
      baslangicTs,
      otomatikBaslat,
      kilitli,
      onYerelOlay,
      onKilitliDeneme,
      onBitti,
    },
    ref
  ) {
    const kapRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oynaticiRef = useRef<any>(null);
    const hazirRef = useRef(false);
    // Sessiz otomatik başlatıldıysa "🔇 Sesi aç" düğmesi gösterilir
    const [sesKapali, setSesKapali] = useState(false);
    // Uzaktan gelen komutların tetiklediği durum değişimlerini geri yayınlamamak
    // için bu zamana kadarki onStateChange olayları yok sayılır.
    const uzaktanKadarRef = useRef(0);
    const olayRef = useRef(onYerelOlay);
    olayRef.current = onYerelOlay;
    const bittiRef = useRef(onBitti);
    bittiRef.current = onBitti;
    const kilitliRef = useRef(kilitli);
    kilitliRef.current = kilitli;
    const kilitliDenemeRef = useRef(onKilitliDeneme);
    kilitliDenemeRef.current = onKilitliDeneme;
    // Odaya göre videonun olması gereken durumu (uzaktan komutlarla güncellenir).
    // Kilitliyken buna aykırı her yerel deneme yankı penceresine bakılmaksızın
    // anında geri alınır — hızlı çift tıklama kilidi delemez.
    const hedefOynuyorRef = useRef(false);

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
              // Geç katılan: oda zaten oynuyorsa sessiz başlat (tarayıcılar
              // muted autoplay'e izin verir). Yankı önleme: PLAYING geri yayınlanmaz.
              if (otomatikBaslat) {
                const o = oynaticiRef.current;
                const hedef = Math.max(
                  0,
                  baslangicSaniye + (Date.now() - baslangicTs) / 1000
                );
                uzaktanKadarRef.current = Date.now() + 2500;
                hedefOynuyorRef.current = true;
                o?.mute?.();
                o?.seekTo?.(hedef, true);
                o?.playVideo?.();
                setSesKapali(true);
              }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStateChange: (olay: any) => {
              const Durum = window.YT.PlayerState;
              const o = oynaticiRef.current;
              // Kilitliyken oda durumuna aykırı yerel deneme anında geri alınır
              // (yankı penceresinden ÖNCE bakılır; hızlı çift tıklama delemez)
              if (kilitliRef.current) {
                if (olay.data === Durum.PLAYING && !hedefOynuyorRef.current) {
                  uzaktanKadarRef.current = Date.now() + 1500;
                  o?.pauseVideo?.();
                  kilitliDenemeRef.current?.();
                  return;
                }
                if (olay.data === Durum.PAUSED && hedefOynuyorRef.current) {
                  uzaktanKadarRef.current = Date.now() + 1500;
                  o?.playVideo?.();
                  kilitliDenemeRef.current?.();
                  return;
                }
              }
              if (Date.now() < uzaktanKadarRef.current) return;
              const saniye = o?.getCurrentTime?.() ?? 0;
              if (olay.data === Durum.PLAYING) {
                hedefOynuyorRef.current = true;
                olayRef.current({ tur: "oynat", saniye });
              } else if (olay.data === Durum.PAUSED) {
                hedefOynuyorRef.current = false;
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

    // Kullanıcı sesi YouTube'un kendi kontrolünden açarsa düğmeyi kaldır
    useEffect(() => {
      if (!sesKapali) return;
      const zaman = setInterval(() => {
        if (oynaticiRef.current?.isMuted?.() === false) setSesKapali(false);
      }, 1000);
      return () => clearInterval(zaman);
    }, [sesKapali]);

    useEffect(() => {
      if (hazirRef.current && oynaticiRef.current?.loadVideoById) {
        uzaktanKadarRef.current = Date.now() + 2000;
        hedefOynuyorRef.current = false; // yeni video duraklatılmış başlar
        oynaticiRef.current.loadVideoById(videoId);
      }
    }, [videoId]);

    useImperativeHandle(ref, () => ({
      oynat(saniye) {
        const o = oynaticiRef.current;
        if (!o?.playVideo) return;
        hedefOynuyorRef.current = true;
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
        hedefOynuyorRef.current = false;
        uzaktanKadarRef.current = Date.now() + 1500;
        o.pauseVideo();
        if (saniye != null) o.seekTo(saniye, true);
      },
    }));

    return (
      <div className="relative h-full w-full bg-black">
        <div ref={kapRef} className="h-full w-full" />
        {sesKapali && (
          <button
            onClick={() => {
              oynaticiRef.current?.unMute?.();
              setSesKapali(false);
            }}
            className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full bg-amber px-4 py-2 text-sm font-bold text-perde shadow-lg transition hover:brightness-110 active:scale-95"
            title="Video sessiz başlatıldı — sesi aç"
          >
            🔇 Sesi aç
          </button>
        )}
      </div>
    );
  }
);

// Sohbet/tepki state değişimlerinde oynatıcının yeniden render edilmesini önler.
export default memo(YouTubeOynatici);
