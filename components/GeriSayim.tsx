"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  baslatan: string;
  onBitti: () => void;
}

export default function GeriSayim({ baslatan, onBitti }: Props) {
  const [deger, setDeger] = useState(3);
  // onBitti her render'da değişebilir; sayaç zamanlayıcısını sıfırlamasın diye ref'te tutulur.
  const bittiRef = useRef(onBitti);
  bittiRef.current = onBitti;

  useEffect(() => {
    if (deger < 0) {
      const zaman = setTimeout(() => bittiRef.current(), 1200);
      return () => clearTimeout(zaman);
    }
    const zaman = setTimeout(() => setDeger((d) => d - 1), 1000);
    return () => clearTimeout(zaman);
  }, [deger]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-perde/85 backdrop-blur-sm">
      <p className="mb-6 text-sm tracking-wide text-soluk">
        {baslatan} senkron sayacı başlattı — sayaç bitince oynat&apos;a bas!
      </p>
      {deger > 0 ? (
        <span key={deger} className="rakam font-display text-9xl font-bold text-amber">
          {deger}
        </span>
      ) : (
        <span className="rakam font-display text-6xl font-bold text-amber sm:text-7xl">
          BAŞLAT! 🎬
        </span>
      )}
    </div>
  );
}
