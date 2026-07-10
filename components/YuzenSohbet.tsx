"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  susturuldum: boolean;
  onGonder: (metin: string) => void;
  /** Pencere hiçbir yolla açılamazsa gösterilecek bildirim. */
  onDesteksiz: (mesaj: string) => void;
}

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

/** "Hep üstte" mini mesaj yazma penceresi. Gelen mesajlar zaten tam ekranda
 *  kayan yazı olarak göründüğü için pencere yalnız yazma satırı taşır.
 *  Sitenin/YouTube'un KENDİ tam ekranında sayfa içine tıklanabilir katman
 *  koymak Chromium'da imkânsız (popover boyanır ama hit-test edilmez) —
 *  ayrı pencere ise gerçek tıklama alır.
 *  Öncelik Document Picture-in-Picture (Chrome/Edge 116+, tam ekranın da
 *  üstünde kalır); yoksa (Opera/Opera GX vb.) normal küçük popup açılır —
 *  o tam ekranın altına inebilir ama görev çubuğundan/tıklamayla öne gelir. */
export default function YuzenSohbet({
  susturuldum,
  onGonder,
  onDesteksiz,
}: Props) {
  const [pencere, setPencere] = useState<Window | null>(null);
  const [metin, setMetin] = useState("");

  // Oda sayfasından çıkarken pencereyi de kapat
  useEffect(() => {
    return () => {
      try {
        pencere?.close();
      } catch {
        /* zaten kapalı */
      }
    };
  }, [pencere]);

  async function acKapat() {
    if (pencere) {
      pencere.close();
      setPencere(null);
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
      onDesteksiz("🪟 Pencere açılamadı — tarayıcı açılır pencereyi engelledi");
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
  }

  function gonder() {
    const temiz = metin.trim();
    if (!temiz) return;
    setMetin("");
    onGonder(temiz);
  }

  return (
    <>
      <button
        onClick={acKapat}
        className={`rounded-lg border px-2 py-1.5 text-xs transition sm:px-3 ${
          pencere
            ? "border-amber/60 text-amber"
            : "border-cizgi text-isik hover:border-amber/60"
        }`}
        title={
          pencere
            ? "Yüzen sohbet penceresini kapat"
            : "Hep üstte mini mesaj penceresi aç — sitenin kendi tam ekranında bile yazabilirsin"
        }
      >
        🪟<span className="hidden sm:inline"> Yüzen sohbet</span>
      </button>
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
    </>
  );
}
