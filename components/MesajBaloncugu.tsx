"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  /** Susturulmuşsa girdi kapalı. */
  susturuldum: boolean;
  onGonder: (metin: string) => void;
  /** 🪟 penceresi hiçbir yolla açılamazsa gösterilecek bildirim. */
  onBilgi: (mesaj: string) => void;
}

const KONUM_ANAHTARI = "rve_balon_konum";

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

/** Videodan ayrılmadan mesaj yazmak için hep ekranda duran yüzen 💬 baloncuğu.
 *  Parmakla/fareyle sürüklenerek istenen yere taşınabilir; konum localStorage'da
 *  saklanır. Kısa dokunuş mini yazma kutusunu açar.
 *  Sürükleme sırasında tüm sahneyi kaplayan görünmez bir "kalkan" katmanı
 *  olayları toplar — yoksa imleç alttaki YouTube iframe'ine girdiği anda
 *  pointer olayları o iframe'e gider ve sürükleme kopar.
 *  Masaüstünde kutuda ek 🪟 düğmesi vardır: yazma satırını "hep üstte" ayrı
 *  pencereye taşır (önce Document PiP, yoksa küçük popup) — sitenin KENDİ tam
 *  ekranında sayfa içi katman Chromium'da tıklanamadığı için tek yol bu.
 *  Mobilde popup koca sekme olarak açıldığından düğme orada hiç gösterilmez. */
export default function MesajBaloncugu({
  susturuldum,
  onGonder,
  onBilgi,
}: Props) {
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState("");
  // null → varsayılan köşe (sağ alt); doluysa sahneye göre px konumu
  const [konum, setKonum] = useState<{ x: number; y: number } | null>(null);
  const [surukluyor, setSurukluyor] = useState(false);
  // Fare+hover olan cihaz (🪟 pencere düğmesi yalnız burada anlamlı)
  const [masaustu, setMasaustu] = useState(false);
  // "Hep üstte" ayrı yazma penceresi (Document PiP ya da popup)
  const [pencere, setPencere] = useState<Window | null>(null);
  const kapRef = useRef<HTMLDivElement>(null);
  const surukleRef = useRef<{
    px: number;
    py: number;
    bx: number;
    by: number;
    tasindi: boolean;
    /** Baloncuktan başladıysa bırakınca kutu açılır; kulptan başladıysa açılmaz. */
    acilir: boolean;
  } | null>(null);
  // Kutunun açıldığı an — hemen ardından gelen hayalet tıklamalara kalkan
  const acilisRef = useRef(0);

  useEffect(() => {
    setMasaustu(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    try {
      const ham = localStorage.getItem(KONUM_ANAHTARI);
      if (ham) setKonum(JSON.parse(ham));
    } catch {
      /* bozuk kayıt: varsayılan köşede kal */
    }
  }, []);

  // Sahne boyutu değişince (pencere boyu, tam ekrana girip çıkma) kayıtlı
  // konum sahnenin dışında kalabilir — görünür alana geri çek
  useEffect(() => {
    const hizala = () =>
      requestAnimationFrame(() =>
        setKonum((k) => (k ? sinirla(k.x, k.y) : k))
      );
    hizala();
    window.addEventListener("resize", hizala);
    document.addEventListener("fullscreenchange", hizala);
    return () => {
      window.removeEventListener("resize", hizala);
      document.removeEventListener("fullscreenchange", hizala);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Oda sayfasından çıkarken 🪟 penceresini de kapat
  useEffect(() => {
    return () => {
      try {
        pencere?.close();
      } catch {
        /* zaten kapalı */
      }
    };
  }, [pencere]);

  function sahneyiBul(): HTMLElement | null {
    return (kapRef.current?.offsetParent as HTMLElement) ?? null;
  }

  // Konumu sahne sınırları içinde tut
  function sinirla(x: number, y: number): { x: number; y: number } {
    const sahne = sahneyiBul();
    const kap = kapRef.current;
    if (!sahne || !kap) return { x, y };
    const s = sahne.getBoundingClientRect();
    const k = kap.getBoundingClientRect();
    return {
      x: Math.min(Math.max(x, 4), Math.max(4, s.width - k.width - 4)),
      y: Math.min(Math.max(y, 4), Math.max(4, s.height - k.height - 4)),
    };
  }

  function surukleBasla(e: React.PointerEvent<HTMLElement>, acilir: boolean) {
    // Dokunuş sonrası üretilen "hayalet" mouse/click olaylarını bastır —
    // yoksa tap'in click'i, aynı noktada yeni açılan kutunun ✕'ine denk gelir
    e.preventDefault();
    const sahne = sahneyiBul();
    const kap = kapRef.current;
    if (!sahne || !kap) return;
    const s = sahne.getBoundingClientRect();
    const k = kap.getBoundingClientRect();
    surukleRef.current = {
      px: e.clientX,
      py: e.clientY,
      bx: k.left - s.left,
      by: k.top - s.top,
      tasindi: false,
      acilir,
    };
    setSurukluyor(true); // kalkan katmanı render edilir, sonraki olaylar ona gelir
  }

  function surukleDevam(e: React.PointerEvent<HTMLElement>) {
    const surukle = surukleRef.current;
    if (!surukle) return;
    const dx = e.clientX - surukle.px;
    const dy = e.clientY - surukle.py;
    // Küçük titremeler dokunuş sayılsın, sürükleme başlamasın
    if (!surukle.tasindi && Math.hypot(dx, dy) < 8) return;
    surukle.tasindi = true;
    setKonum(sinirla(surukle.bx + dx, surukle.by + dy));
  }

  /** iptal: pointercancel geldiyse dokunuş olarak da sayma. */
  function surukleBitir(iptal = false) {
    const surukle = surukleRef.current;
    surukleRef.current = null;
    setSurukluyor(false);
    if (!surukle) return;
    if (surukle.tasindi) {
      setKonum((k) => {
        try {
          if (k) localStorage.setItem(KONUM_ANAHTARI, JSON.stringify(k));
        } catch {
          /* localStorage kapalıysa konum bu oturumda kalır */
        }
        return k;
      });
    } else if (!iptal && surukle.acilir) {
      acilisRef.current = Date.now();
      setAcik(true);
    }
  }

  function gonder() {
    if (Date.now() - acilisRef.current < 350) return; // hayalet tıklama
    const temiz = metin.trim();
    if (!temiz) return;
    setMetin("");
    onGonder(temiz);
  }

  function kapat() {
    if (Date.now() - acilisRef.current < 350) return; // hayalet tıklama
    setAcik(false);
  }

  async function pencereAc() {
    if (Date.now() - acilisRef.current < 350) return; // hayalet tıklama
    if (pencere) {
      pencere.focus();
      setAcik(false);
      return;
    }
    let win: Window | null = null;
    const dpip = dpipAl();
    if (dpip) {
      try {
        win = await dpip.requestWindow({ width: 380, height: 120 });
      } catch {
        /* reddedildi/başarısız — popup'a düş */
      }
    }
    if (!win) {
      // Document PiP yok (Opera/Opera GX vb.): normal küçük popup penceresi.
      // Ekranın sağ altına yakın açılır; kullanıcı istediği yere taşır.
      const sol = Math.max(0, (window.screen?.width ?? 1280) - 420);
      const ust = Math.max(0, (window.screen?.height ?? 800) - 240);
      win = window.open(
        "about:blank",
        "rve-yuzen-sohbet",
        `popup=yes,width=380,height=120,left=${sol},top=${ust}`
      );
    }
    if (!win) {
      onBilgi("🪟 Pencere açılamadı — tarayıcı açılır pencereyi engelledi");
      return;
    }
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
    setAcik(false); // yazma artık pencerede — sayfadaki kutuyu kapat
  }

  return (
    <div
      ref={kapRef}
      // pointer-events-auto: popover kabı (tam ekran katmanı) olayları
      // geçirmez; baloncuk kendi olaylarını burada geri açar
      className={`pointer-events-auto absolute z-30 ${konum ? "" : "bottom-16 right-3"}`}
      style={konum ? { left: konum.x, top: konum.y } : undefined}
    >
      {surukluyor && (
        <div
          className="fixed inset-0 z-40 cursor-move touch-none"
          onPointerMove={surukleDevam}
          onPointerUp={() => surukleBitir()}
          onPointerCancel={() => surukleBitir(true)}
        />
      )}
      {acik ? (
        <div className="flex w-80 max-w-[calc(100vw-2rem)] items-center gap-1.5 rounded-full bg-koltuk/95 p-1.5 shadow-xl backdrop-blur-sm">
          <span
            onPointerDown={(e) => surukleBasla(e, false)}
            onPointerMove={surukleDevam}
            onPointerUp={() => surukleBitir()}
            onPointerCancel={() => surukleBitir(true)}
            title="Taşımak için sürükle"
            className="flex h-9 w-5 shrink-0 cursor-move touch-none select-none items-center justify-center text-soluk"
          >
            ⠿
          </span>
          <input
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") gonder();
              if (e.key === "Escape") setAcik(false);
            }}
            disabled={susturuldum}
            placeholder={susturuldum ? "🔇 Susturuldun" : "Mesaj yaz…"}
            maxLength={500}
            autoFocus
            className="min-w-0 flex-1 rounded-full border border-cizgi bg-perde px-3.5 py-2 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60 disabled:opacity-60"
          />
          <button
            onClick={gonder}
            disabled={susturuldum}
            title="Gönder"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber text-sm font-bold text-perde transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            ➤
          </button>
          {masaustu && (
            <button
              onClick={pencereAc}
              title="Hep üstte mini pencereye taşı — sitenin kendi tam ekranında bile yazarsın"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cizgi text-sm text-soluk transition hover:border-amber/60 hover:text-amber active:scale-95"
            >
              🪟
            </button>
          )}
          <button
            onClick={kapat}
            title="Kapat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cizgi text-sm text-soluk transition hover:border-amber/60 hover:text-amber active:scale-95"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onPointerDown={(e) => surukleBasla(e, true)}
          onPointerMove={surukleDevam}
          onPointerUp={() => surukleBitir()}
          onPointerCancel={() => surukleBitir(true)}
          title="Mesaj yaz (basılı tutup sürükleyerek taşı)"
          className="flex h-12 w-12 touch-none select-none items-center justify-center rounded-full bg-amber text-xl shadow-xl transition hover:brightness-110 active:scale-95"
        >
          💬
        </button>
      )}
      {pencere &&
        createPortal(
          <div className="flex h-dvh items-center gap-1.5 bg-perde p-2 font-sans">
            <input
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && gonder()}
              disabled={susturuldum}
              placeholder={susturuldum ? "🔇 Susturuldun" : "Mesaj yaz…"}
              maxLength={500}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-cizgi bg-koltuk px-2.5 py-2 text-sm text-isik outline-none placeholder:text-soluk/60 focus:border-amber/60 disabled:opacity-60"
            />
            <button
              onClick={gonder}
              disabled={susturuldum}
              title="Gönder"
              className="shrink-0 rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-perde transition hover:brightness-110 disabled:opacity-50"
            >
              ➤
            </button>
          </div>,
          pencere.document.body
        )}
    </div>
  );
}
