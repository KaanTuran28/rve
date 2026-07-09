"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  kodUret,
  takmaAdOku,
  takmaAdKaydet,
  sahipAnahtariKaydet,
} from "@/lib/supabase";
import KurulumEksik from "@/components/KurulumEksik";

export default function AnaSayfa() {
  const router = useRouter();
  const [ad, setAd] = useState("");
  const [odaAdi, setOdaAdi] = useState("");
  const [katilKodu, setKatilKodu] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    setAd(takmaAdOku());
  }, []);

  if (!supabase) return <KurulumEksik />;

  function adKontrol(): boolean {
    if (!ad.trim()) {
      setHata("Önce takma adını yaz.");
      return false;
    }
    takmaAdKaydet(ad);
    return true;
  }

  async function odaKur() {
    if (!adKontrol() || mesgul) return;
    setMesgul(true);
    setHata("");
    const kod = kodUret();
    // Sahip anahtarı: sadece kuranın tarayıcısında durur, kilit yetkisi verir
    const sahipAnahtari = crypto.randomUUID();
    const { error } = await supabase!.from("rooms").insert({
      code: kod,
      name: odaAdi.trim() || `${ad.trim()} film gecesi`,
      owner_token: sahipAnahtari,
    });
    if (error) {
      setHata("Oda kurulamadı: " + error.message);
      setMesgul(false);
      return;
    }
    sahipAnahtariKaydet(kod, sahipAnahtari);
    router.push(`/oda/${kod}`);
  }

  async function odayaKatil() {
    const kod = katilKodu.trim().toUpperCase();
    if (!adKontrol() || mesgul) return;
    if (kod.length < 4) {
      setHata("Geçerli bir oda kodu gir.");
      return;
    }
    setMesgul(true);
    setHata("");
    const { data } = await supabase!
      .from("rooms")
      .select("code")
      .eq("code", kod)
      .maybeSingle();
    if (!data) {
      setHata("Bu kodla bir oda bulunamadı.");
      setMesgul(false);
      return;
    }
    router.push(`/oda/${kod}`);
  }

  return (
    <main className="huzme flex min-h-dvh flex-col items-center justify-center p-6">
      <header className="mb-10 text-center">
        <h1 className="parlama font-display text-7xl font-bold tracking-tight text-isik sm:text-8xl">
          Rve<span className="text-amber">.</span>
        </h1>
        <p className="mt-3 text-sm text-soluk">
          Oda kur, kodu arkadaşlarına at — perde herkese aynı anda açılsın.
        </p>
      </header>

      <div className="bilet w-full max-w-md rounded-2xl bg-koltuk p-6 sm:p-8">
        <label className="block text-xs font-semibold uppercase tracking-wider text-soluk">
          Takma adın
        </label>
        <input
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          placeholder="örn. kaan"
          maxLength={20}
          className="mt-2 w-full rounded-lg border border-cizgi bg-perde px-3 py-2.5 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60"
        />

        <div className="mt-6 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-soluk">
            Yeni oda
          </label>
          <input
            value={odaAdi}
            onChange={(e) => setOdaAdi(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && odaKur()}
            placeholder="Oda adı (isteğe bağlı)"
            maxLength={40}
            className="w-full rounded-lg border border-cizgi bg-perde px-3 py-2.5 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60"
          />
          <button
            onClick={odaKur}
            disabled={mesgul}
            className="w-full rounded-lg bg-amber py-2.5 text-sm font-bold text-perde transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {mesgul ? "Hazırlanıyor…" : "Oda Kur 🎬"}
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-soluk">
          <span className="h-px flex-1 bg-cizgi" />
          veya
          <span className="h-px flex-1 bg-cizgi" />
        </div>

        <div className="flex gap-2">
          <input
            value={katilKodu}
            onChange={(e) => setKatilKodu(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && odayaKatil()}
            placeholder="ODA KODU"
            maxLength={8}
            className="min-w-0 flex-1 rounded-lg border border-cizgi bg-perde px-3 py-2.5 text-center font-display text-sm font-semibold tracking-[0.3em] outline-none placeholder:tracking-widest placeholder:text-soluk/60 focus:border-amber/60"
          />
          <button
            onClick={odayaKatil}
            disabled={mesgul}
            className="rounded-lg border border-amber/60 px-4 py-2.5 text-sm font-semibold text-amber transition hover:bg-amber/10 disabled:opacity-50"
          >
            Katıl
          </button>
        </div>

        {hata && <p className="mt-4 text-center text-xs text-canli">{hata}</p>}
      </div>

      <p className="mt-8 max-w-md text-center text-xs leading-relaxed text-soluk">
        YouTube videoları otomatik senkronize oynar; film siteleri için oda içi
        “3-2-1 senkron” sayacı vardır. Arkadaş ortamı içindir, hesap gerekmez.
        Netflix ve benzeri sitelerde tam otomatik senkron için{" "}
        <a
          href="/eklenti"
          className="font-semibold text-amber underline-offset-2 hover:underline"
        >
          🧩 tarayıcı eklentisini
        </a>{" "}
        kurabilirsin.
      </p>
    </main>
  );
}
