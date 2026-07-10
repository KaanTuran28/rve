"use client";

import { memo } from "react";

interface Props {
  url: string;
  /** Bilinen yayın servisi adı (Netflix vb.) ya da null. Doluysa iframe denenmez. */
  servis: string | null;
}

/** Harici içerik sahnesi. Üstteki kontroller (saat, 3-2-1, eklenti)
 *  tüm modlarda ortak olan FilmPaneli'nde. */
function HariciIzleyici({ url, servis }: Props) {
  // DB'ye doğrudan yazılmış olabilecek javascript:/data: gibi adresleri asla
  // iframe/bağlantı olarak render etme
  const guvenliUrl = /^https?:\/\//i.test(url);

  // Netflix vb. gömülemeyen servis: iframe deneme, kısa bir yönerge göster.
  if (servis) {
    return (
      <div className="huzme flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-3xl">🍿</span>
        <p className="max-w-xs text-sm text-soluk">
          <b className="text-isik">{servis}</b> gömülemez — herkes{" "}
          <b className="text-isik">“Sekmede aç”</b> ile kendi hesabında açsın,
          üstteki <b className="text-isik">▶ 3-2-1</b> ile birlikte başlayın.
        </p>
      </div>
    );
  }

  // Bilinmeyen harici site: gömmeyi dene (izin veriyorsa oynar).
  return guvenliUrl ? (
    <iframe
      src={url}
      className="h-full w-full bg-black"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
    />
  ) : (
    <div className="huzme flex h-full w-full items-center justify-center p-6">
      <p className="max-w-xs text-center text-sm text-soluk">
        Bu adres güvenli görünmüyor (http/https değil) — gömülmedi.
      </p>
    </div>
  );
}

// iframe/kart'ın sohbet güncellemelerinde yeniden render edilmesini önler.
export default memo(HariciIzleyici);
