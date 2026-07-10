"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Algi = "bekleniyor" | "kuruldu";

// Desteklenen popüler tarayıcılar (hepsi Chromium tabanlı — aynı zip çalışır)
const tarayicilar = [
  {
    ad: "Chrome",
    adEkli: "Chrome’da",
    simge: "🟡",
    adres: "chrome://extensions",
    modYeri: "sağ üst köşedeki",
  },
  {
    ad: "Edge",
    adEkli: "Edge’de",
    simge: "🔵",
    adres: "edge://extensions",
    modYeri: "sol menüdeki",
  },
  {
    ad: "Opera",
    adEkli: "Opera’da",
    simge: "🔴",
    adres: "opera://extensions",
    modYeri: "sağ üst köşedeki",
  },
  {
    ad: "Brave",
    adEkli: "Brave’de",
    simge: "🦁",
    adres: "brave://extensions",
    modYeri: "sağ üst köşedeki",
  },
] as const;

export default function EklentiSayfasi() {
  const [algi, setAlgi] = useState<Algi>("bekleniyor");
  const [tarayici, setTarayici] = useState<(typeof tarayicilar)[number]>(
    tarayicilar[0]
  );

  // Eklentinin content script'i ping'e pong döner (kurulunca açık sekmelere de
  // enjekte edildiği için bu sayfa yenilenmeden yeşile döner)
  useEffect(() => {
    const dinle = (e: MessageEvent) => {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.__rve === "pong" || e.data.__rve === "bagliOk") {
        setAlgi("kuruldu");
      }
    };
    window.addEventListener("message", dinle);
    const zaman = setInterval(
      () => window.postMessage({ __rve: "ping" }, "*"),
      2000
    );
    window.postMessage({ __rve: "ping" }, "*");
    return () => {
      window.removeEventListener("message", dinle);
      clearInterval(zaman);
    };
  }, []);

  const adimlar: { baslik: string; detay: React.ReactNode }[] = [
    {
      baslik: "Eklentiyi indir ve klasöre çıkar",
      detay: (
        <>
          Yukarıdaki düğmeyle <b className="text-isik">rve-eklenti.zip</b>{" "}
          dosyasını indir. İnen dosyaya sağ tıklayıp{" "}
          <b className="text-isik">“Tümünü ayıkla…”</b> de ve bir klasöre çıkar.
          Bu klasörü silme — eklenti oradan çalışır (Belgeler gibi kalıcı bir
          yere koy).
        </>
      ),
    },
    {
      baslik: `${tarayici.adEkli} eklenti sayfasını aç`,
      detay: (
        <>
          Adres çubuğuna{" "}
          <code className="rounded bg-perde px-1.5 py-0.5 text-amber">
            {tarayici.adres}
          </code>{" "}
          yaz ve Enter’a bas. {tarayici.modYeri}{" "}
          <b className="text-isik">Geliştirici modu</b> anahtarını aç.
        </>
      ),
    },
    {
      baslik: "“Paketlenmemiş öğe yükle” ile klasörü seç",
      detay: (
        <>
          <b className="text-isik">“Paketlenmemiş öğe yükle”</b> (Load unpacked)
          düğmesine bas ve 1. adımda çıkardığın klasörü seç. Hepsi bu — bu
          sayfadaki kutu yeşile dönünce hazırsın demektir.
        </>
      ),
    },
  ];

  return (
    <main className="huzme min-h-dvh px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight"
          >
            Rve<span className="text-amber">.</span>
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-cizgi px-3 py-1.5 text-xs text-isik transition hover:border-amber/60"
          >
            ← Ana sayfa
          </Link>
        </header>

        <h1 className="font-display text-3xl font-bold">
          🧩 Rve Senkron Eklentisi
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-soluk">
          Netflix ve diğer video sitelerinde <b className="text-isik">otomatik</b>{" "}
          senkron için küçük bir tarayıcı eklentisi: odadaki biri oynat /
          duraklat / sar yaptığında herkeste aynı anda uygulanır. Chrome, Edge,
          Opera ve Brave ile çalışır (Firefox henüz desteklenmiyor); kurulum 1-2
          dakika sürer.
        </p>

        {/* Tarayıcı seçici: adımlar seçime göre uyarlanır */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-soluk">
            Tarayıcını seç
          </p>
          <div className="flex flex-wrap gap-2">
            {tarayicilar.map((t) => (
              <button
                key={t.ad}
                onClick={() => setTarayici(t)}
                className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
                  tarayici.ad === t.ad
                    ? "border-amber/70 bg-amber/10 text-amber"
                    : "border-cizgi text-isik hover:border-amber/50"
                }`}
              >
                {t.simge} {t.ad}
              </button>
            ))}
          </div>
        </div>

        {/* Canlı algılama kutusu */}
        <div
          className={`bilet mt-6 flex items-center gap-3 rounded-2xl p-4 ${
            algi === "kuruldu" ? "bg-canli/10" : "bg-koltuk"
          }`}
        >
          {algi === "kuruldu" ? (
            <>
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-bold text-canli">
                  Eklenti kurulu — hazırsın!
                </p>
                <p className="mt-0.5 text-xs text-soluk">
                  Artık odada video açıkken film panelindeki{" "}
                  <b className="text-isik">🧩 Eklentiye bağla</b> düğmesine
                  basman yeterli — kod otomatik girilir.
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="nabiz text-2xl">🔎</span>
              <div>
                <p className="text-sm font-bold text-isik">
                  Eklenti henüz algılanmadı
                </p>
                <p className="mt-0.5 text-xs text-soluk">
                  Aşağıdaki üç adımı tamamla — kurulum biter bitmez bu kutu
                  kendiliğinden yeşile döner.
                </p>
              </div>
            </>
          )}
        </div>

        {/* İndirme */}
        <a
          href="/rve-eklenti.zip"
          download
          className="mt-6 block w-full rounded-xl bg-amber py-3.5 text-center font-display text-base font-bold text-perde transition hover:brightness-110 active:scale-[0.99]"
        >
          ⬇ Eklentiyi indir (rve-eklenti.zip)
        </a>

        {/* Adımlar */}
        <ol className="mt-8 space-y-4">
          {adimlar.map((a, i) => (
            <li
              key={a.baslik}
              className="bilet flex gap-4 rounded-2xl bg-koltuk p-5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-sm font-bold text-amber">
                {i + 1}
              </span>
              <div>
                <p className="font-display text-sm font-bold">{a.baslik}</p>
                <p className="mt-1 text-xs leading-relaxed text-soluk">
                  {a.detay}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Android'de kurulum */}
        <div className="bilet mt-6 rounded-2xl bg-koltuk p-5">
          <p className="font-display text-sm font-bold">
            📱 Telefondan mı geldin? (Android)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-soluk">
            Normal mobil Chrome/Safari eklenti desteklemez. Android'de Play
            Store'dan <b className="text-isik">Kiwi Browser</b> ya da{" "}
            <b className="text-isik">Lemur Browser</b>'ı ücretsiz kur, sonra:
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-soluk">
            <li>
              Bu sayfayı o tarayıcıda aç ve yukarıdaki düğmeyle{" "}
              <b className="text-isik">rve-eklenti.zip</b>'i indir (çıkarmana
              gerek yok).
            </li>
            <li>
              Adres çubuğuna{" "}
              <code className="rounded bg-perde px-1.5 py-0.5 text-amber">
                kiwi://extensions
              </code>{" "}
              yaz (Lemur'da menü → <b className="text-isik">Eklentiler</b>) ve{" "}
              <b className="text-isik">Geliştirici modu</b>'nu aç.
            </li>
            <li>
              <b className="text-isik">"+ (.zip / .crx dosyasından)"</b>{" "}
              düğmesiyle indirdiğin zip'i seç — bu sayfadaki kutu yeşile döner.
            </li>
          </ol>
          <p className="mt-2 text-xs leading-relaxed text-soluk">
            <b className="text-isik">iPhone/iPad:</b> Safari yalnızca App
            Store'dan imzalı eklentilere izin verdiği için kurulum mümkün değil
            — ama YouTube senkronu ve sohbet eklentisiz de çalışır.
          </p>
        </div>

        <div className="mt-8 space-y-2 text-xs leading-relaxed text-soluk">
          <p>
            <b className="text-isik">Nasıl kullanılır?</b> Odada bir video
            açıkken film panelinde eklenti durumu her zaman görünür:{" "}
            <b className="text-isik">🧩 Eklentiye bağla</b>’ya tek tık — oda
            kodu otomatik girilir, bağlanınca{" "}
            <b className="text-isik">🧩 Eklenti bağlı ✓</b> olur. Sonra herkes
            filmi kendi sekmesinde açar; oynat/duraklat/sar otomatik
            senkronlanır.
          </p>
          <p>
            <b className="text-isik">Güncelleme gerekirse:</b> yeni zip’i indir,
            aynı klasörün üzerine çıkar ve eklenti sayfasındaki{" "}
            <b className="text-isik">⟳ yenile</b> okuna bas.
          </p>
          <p>
            <b className="text-isik">Güvenlik notu:</b> eklenti yalnızca
            sayfadaki videoyu oynat/duraklat/sar komutlarıyla yönetir ve sadece
            senin gireceğin oda koduna bağlanır; şifre, çerez ya da kişisel veri
            okumaz.
          </p>
        </div>
      </div>
    </main>
  );
}
