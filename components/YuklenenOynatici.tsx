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

interface Props {
  url: string;
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

const YuklenenOynatici = forwardRef<OynaticiKontrol, Props>(
  function YuklenenOynatici(
    {
      url,
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
    const videoRef = useRef<HTMLVideoElement>(null);
    // Sessiz otomatik başlatıldıysa "🔇 Sesi aç" düğmesi gösterilir
    const [sesKapali, setSesKapali] = useState(false);
    // Uzaktan gelen komutların tetiklediği durum değişimlerini geri yayınlamamak
    // için bu zamana kadarki play/pause olayları yok sayılır.
    const uzaktanKadarRef = useRef(0);
    const olayRef = useRef(onYerelOlay);
    olayRef.current = onYerelOlay;
    const bittiRef = useRef(onBitti);
    bittiRef.current = onBitti;
    const kilitliRef = useRef(kilitli);
    kilitliRef.current = kilitli;
    const kilitliDenemeRef = useRef(onKilitliDeneme);
    kilitliDenemeRef.current = onKilitliDeneme;
    // Odaya göre videonun olması gereken durumu — kilitliyken buna aykırı her
    // yerel deneme yankı penceresine bakılmaksızın anında geri alınır.
    const hedefOynuyorRef = useRef(false);
    // İlk metadata yüklemesinde bir kez geç-katılan yakalaması yapılır.
    const ilkYuklemeRef = useRef(true);
    // Efekt mount'ta da çalıştığından, kaynak değişimini yalnız gerçek
    // değişimlerde (mount sonrası) yeniden yüklemek için.
    const monteRef = useRef(false);

    // Video kaynağı değişince (kuyruktan sıradakine geçiş vb.) baştan yükle.
    useEffect(() => {
      if (!monteRef.current) {
        monteRef.current = true;
        return;
      }
      const v = videoRef.current;
      if (!v) return;
      uzaktanKadarRef.current = Date.now() + 2000;
      hedefOynuyorRef.current = false;
      v.load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    function metadataYuklendi() {
      const v = videoRef.current;
      if (!v) return;
      if (ilkYuklemeRef.current && otomatikBaslat) {
        const hedef = Math.max(
          0,
          baslangicSaniye + (Date.now() - baslangicTs) / 1000
        );
        uzaktanKadarRef.current = Date.now() + 2500;
        hedefOynuyorRef.current = true;
        v.muted = true;
        v.currentTime = hedef;
        v.play().catch(() => {});
        setSesKapali(true);
      } else if (ilkYuklemeRef.current) {
        v.currentTime = Math.max(0, baslangicSaniye);
      }
      ilkYuklemeRef.current = false;
    }

    function oynatildi() {
      const v = videoRef.current;
      if (kilitliRef.current && !hedefOynuyorRef.current) {
        uzaktanKadarRef.current = Date.now() + 1500;
        v?.pause();
        kilitliDenemeRef.current?.();
        return;
      }
      if (Date.now() < uzaktanKadarRef.current) return;
      hedefOynuyorRef.current = true;
      olayRef.current({ tur: "oynat", saniye: v?.currentTime ?? 0 });
    }

    function duraklatildi() {
      const v = videoRef.current;
      if (v?.ended) return; // video bitince de pause tetiklenir, onBitti ele alır
      if (kilitliRef.current && hedefOynuyorRef.current) {
        uzaktanKadarRef.current = Date.now() + 1500;
        v?.play().catch(() => {});
        kilitliDenemeRef.current?.();
        return;
      }
      if (Date.now() < uzaktanKadarRef.current) return;
      hedefOynuyorRef.current = false;
      olayRef.current({ tur: "duraklat", saniye: v?.currentTime ?? 0 });
    }

    // Kullanıcı sesi tarayıcının kendi kontrolünden açarsa düğmeyi kaldır
    useEffect(() => {
      if (!sesKapali) return;
      const zaman = setInterval(() => {
        if (videoRef.current && !videoRef.current.muted) setSesKapali(false);
      }, 1000);
      return () => clearInterval(zaman);
    }, [sesKapali]);

    useImperativeHandle(ref, () => ({
      oynat(saniye) {
        const v = videoRef.current;
        if (!v) return;
        hedefOynuyorRef.current = true;
        uzaktanKadarRef.current = Date.now() + 1500;
        if (saniye != null && Math.abs(v.currentTime - saniye) > 1.5) {
          v.currentTime = saniye;
        }
        v.play().catch(() => {});
      },
      duraklat(saniye) {
        const v = videoRef.current;
        if (!v) return;
        hedefOynuyorRef.current = false;
        uzaktanKadarRef.current = Date.now() + 1500;
        v.pause();
        if (saniye != null) v.currentTime = saniye;
      },
    }));

    return (
      <div className="relative h-full w-full bg-black">
        <video
          ref={videoRef}
          src={url}
          className="h-full w-full"
          controls
          playsInline
          onLoadedMetadata={metadataYuklendi}
          onPlay={oynatildi}
          onPause={duraklatildi}
          onEnded={() => bittiRef.current?.()}
        />
        {sesKapali && (
          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.muted = false;
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
export default memo(YuklenenOynatici);
