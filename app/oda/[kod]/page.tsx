"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  takmaAdOku,
  takmaAdKaydet,
  youtubeIdAyikla,
  yayinServisi,
} from "@/lib/supabase";
import type { Mesaj, Oda, OynaticiKontrol, SenkronOlay } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import YouTubeOynatici from "@/components/YouTubeOynatici";
import HariciIzleyici from "@/components/HariciIzleyici";
import Sohbet from "@/components/Sohbet";
import Katilimcilar from "@/components/Katilimcilar";
import GeriSayim from "@/components/GeriSayim";
import KurulumEksik from "@/components/KurulumEksik";

type Durum = "yukleniyor" | "bulunamadi" | "hazir";

export default function OdaSayfasi() {
  const { kod } = useParams<{ kod: string }>();
  const router = useRouter();
  const odaKodu = (kod ?? "").toUpperCase();

  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [oda, setOda] = useState<Oda | null>(null);
  const [ad, setAd] = useState("");
  const [adTaslak, setAdTaslak] = useState("");
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [katilimcilar, setKatilimcilar] = useState<string[]>([]);
  const [geriSayimBaslatan, setGeriSayimBaslatan] = useState<string | null>(
    null
  );
  const [sinemaModu, setSinemaModu] = useState(false);
  const [videoGirdi, setVideoGirdi] = useState("");
  const [kopyalandi, setKopyalandi] = useState(false);
  const [gecikmeUyarisi, setGecikmeUyarisi] = useState(false);
  // Harici (Netflix vb.) ortak senkron saati: oynuyorsa gecen = taban + (now - ts)
  const [hSaat, setHSaat] = useState<{
    oynuyor: boolean;
    taban: number;
    ts: number;
  }>({ oynuyor: false, taban: 0, ts: 0 });

  const kanalRef = useRef<RealtimeChannel | null>(null);
  const hSaatRef = useRef(hSaat);
  hSaatRef.current = hSaat;
  const oynaticiRef = useRef<OynaticiKontrol | null>(null);
  const odaIdRef = useRef<string | null>(null);
  const baslangicSaniyeRef = useRef(0);
  const baglantiZamaniRef = useRef(0);

  // Takma adı yükle
  useEffect(() => {
    setAd(takmaAdOku());
  }, []);

  // Yükleme 8 saniyeyi aşarsa ipucu göster
  useEffect(() => {
    if (durum !== "yukleniyor") return;
    const zaman = setTimeout(() => setGecikmeUyarisi(true), 8000);
    return () => clearTimeout(zaman);
  }, [durum]);

  // Odayı ve mesaj geçmişini yükle
  useEffect(() => {
    if (!supabase || !odaKodu) return;
    let iptal = false;
    (async () => {
      const { data } = await supabase!
        .from("rooms")
        .select("*")
        .eq("code", odaKodu)
        .maybeSingle();
      if (iptal) return;
      if (!data) {
        setDurum("bulunamadi");
        return;
      }
      const odaVerisi = data as Oda;
      let konum = odaVerisi.playback_time;
      if (odaVerisi.is_playing) {
        konum += (Date.now() - Date.parse(odaVerisi.updated_at)) / 1000;
      }
      baslangicSaniyeRef.current = Math.max(0, konum);
      odaIdRef.current = odaVerisi.id;
      // Harici içerik için ortak saati oda kaydından türet (geç gelen senkron kalır)
      if (odaVerisi.video_type === "external") {
        let gecen = odaVerisi.playback_time;
        if (odaVerisi.is_playing) {
          gecen += (Date.now() - Date.parse(odaVerisi.updated_at)) / 1000;
        }
        setHSaat({
          oynuyor: odaVerisi.is_playing,
          taban: Math.max(0, gecen),
          ts: Date.now(),
        });
      }
      setOda(odaVerisi);
      setDurum("hazir");

      const { data: gecmis } = await supabase!
        .from("messages")
        .select("*")
        .eq("room_id", odaVerisi.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!iptal && gecmis) setMesajlar([...(gecmis as Mesaj[])].reverse());
    })();
    return () => {
      iptal = true;
    };
  }, [odaKodu]);

  // Yerel "katıldı/ayrıldı" bildirimi
  const sistemMesaji = useCallback((icerik: string) => {
    setMesajlar((mevcut) => [
      ...mevcut,
      {
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        room_id: "",
        nickname: "",
        content: icerik,
        created_at: new Date().toISOString(),
        sistem: true,
      },
    ]);
  }, []);

  // Uzaktan gelen senkron olayları
  const olayIsle = useCallback((olay: SenkronOlay) => {
    if (olay.tur === "oynat") {
      oynaticiRef.current?.oynat(olay.saniye);
    } else if (olay.tur === "duraklat") {
      oynaticiRef.current?.duraklat(olay.saniye);
    } else if (olay.tur === "video") {
      baslangicSaniyeRef.current = 0;
      setHSaat({ oynuyor: false, taban: 0, ts: 0 });
      setOda((onceki) =>
        onceki
          ? {
              ...onceki,
              video_url: olay.url,
              video_type: olay.videoTipi,
              is_playing: false,
              playback_time: 0,
            }
          : onceki
      );
    } else if (olay.tur === "geriSayim") {
      setGeriSayimBaslatan(olay.baslatan);
    } else if (olay.tur === "hariciDurdur") {
      setHSaat({ oynuyor: false, taban: Math.max(0, olay.saniye), ts: Date.now() });
    }
  }, []);

  // Gerçek zamanlı kanal (oda başına bir tane)
  useEffect(() => {
    if (!supabase || !oda?.id || !ad) return;
    const kanal = supabase.channel(`oda:${odaKodu}`, {
      config: { broadcast: { self: false }, presence: { key: ad } },
    });
    kanal
      .on("broadcast", { event: "senkron" }, ({ payload }) =>
        olayIsle(payload as SenkronOlay)
      )
      .on("broadcast", { event: "mesaj" }, ({ payload }) =>
        setMesajlar((m) => [...m, payload as Mesaj])
      )
      .on("presence", { event: "sync" }, () =>
        setKatilimcilar(Object.keys(kanal.presenceState()).sort())
      )
      .on("presence", { event: "join" }, ({ key }) => {
        // İlk bağlantıda mevcut üyeler için gelen join'leri bildirme
        if (key !== ad && Date.now() - baglantiZamaniRef.current > 3000) {
          sistemMesaji(`${key} salona katıldı 🎟️`);
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key !== ad) sistemMesaji(`${key} salondan ayrıldı`);
      })
      .subscribe((kanalDurumu) => {
        if (kanalDurumu === "SUBSCRIBED") {
          baglantiZamaniRef.current = Date.now();
          kanal.track({ katildi: Date.now() });
        }
      });
    kanalRef.current = kanal;
    return () => {
      kanalRef.current = null;
      supabase!.removeChannel(kanal);
    };
  }, [oda?.id, ad, odaKodu, olayIsle, sistemMesaji]);

  // Presence'ta benden başka kimse yoksa odanın son üyesiyim
  const sonUyeyMiyim = useCallback(() => {
    const kanal = kanalRef.current;
    if (!kanal) return false;
    return Object.keys(kanal.presenceState()).length <= 1;
  }, []);

  // Çıkışta / son üyeyken odayı ve mesajlarını DB'den sil (mesajlar FK cascade ile gider)
  const cikisYap = useCallback(async () => {
    const kanal = kanalRef.current;
    if (sonUyeyMiyim() && supabase && odaIdRef.current) {
      await supabase.from("rooms").delete().eq("id", odaIdRef.current);
    }
    if (kanal) {
      await kanal.untrack().catch(() => {});
      supabase?.removeChannel(kanal);
    }
    kanalRef.current = null;
    router.push("/");
  }, [sonUyeyMiyim, router]);

  // Sekme kapanırken son üyeysem keepalive fetch ile odayı sil (async client'a güvenilmez)
  useEffect(() => {
    const temizle = (e: PageTransitionEvent) => {
      // bfcache'e giriyorsa (mobilde arka plana alma vb.) geri dönülebilir; silme
      if (e.persisted) return;
      if (!odaIdRef.current || !sonUyeyMiyim()) return;
      if (!supabaseUrl || !supabaseAnonKey) return;
      fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${odaIdRef.current}`, {
        method: "DELETE",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Prefer: "return=minimal",
        },
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("pagehide", temizle);
    return () => window.removeEventListener("pagehide", temizle);
  }, [sonUyeyMiyim]);

  // Oynatıcıdan gelen yerel olayları yayınla + kalıcı duruma yaz
  const yerelOlay = useCallback((olay: SenkronOlay) => {
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: olay,
    });
    if (
      (olay.tur === "oynat" || olay.tur === "duraklat") &&
      supabase &&
      odaIdRef.current
    ) {
      supabase
        .from("rooms")
        .update({
          is_playing: olay.tur === "oynat",
          playback_time: olay.saniye,
          updated_at: new Date().toISOString(),
        })
        .eq("id", odaIdRef.current)
        .then(() => {});
    }
  }, []);

  async function videoDegistir() {
    const girdi = videoGirdi.trim();
    if (!girdi || !oda || !supabase) return;
    const ytId = youtubeIdAyikla(girdi);
    const yeniTip = ytId ? "youtube" : "external";
    const yeniUrl = ytId
      ? girdi
      : girdi.startsWith("http")
        ? girdi
        : `https://${girdi}`;
    baslangicSaniyeRef.current = 0;
    setHSaat({ oynuyor: false, taban: 0, ts: 0 });
    setOda({
      ...oda,
      video_url: yeniUrl,
      video_type: yeniTip,
      is_playing: false,
      playback_time: 0,
    });
    setVideoGirdi("");
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "video", url: yeniUrl, videoTipi: yeniTip },
    });
    await supabase
      .from("rooms")
      .update({
        video_url: yeniUrl,
        video_type: yeniTip,
        is_playing: false,
        playback_time: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", oda.id);
  }

  async function mesajGonder(metin: string) {
    if (!oda || !supabase) return;
    const { data } = await supabase
      .from("messages")
      .insert({ room_id: oda.id, nickname: ad, content: metin })
      .select()
      .single();
    if (!data) return;
    setMesajlar((m) => [...m, data as Mesaj]);
    kanalRef.current?.send({ type: "broadcast", event: "mesaj", payload: data });
  }

  const geriSayimBaslat = useCallback(() => {
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "geriSayim", baslatan: ad },
    });
    // broadcast self kapalı: yerelde elle başlat
    setGeriSayimBaslatan(ad);
  }, [ad]);

  // 3-2-1 bitince harici saati başlat/devam ettir; başlatan kişi kalıcı duruma yazar
  const geriSayimBitti = useCallback(() => {
    setHSaat((s) => ({ oynuyor: true, taban: s.taban, ts: Date.now() }));
    if (geriSayimBaslatan === ad && supabase && odaIdRef.current) {
      supabase
        .from("rooms")
        .update({
          is_playing: true,
          playback_time: hSaatRef.current.taban,
          updated_at: new Date().toISOString(),
        })
        .eq("id", odaIdRef.current)
        .then(() => {});
    }
    setGeriSayimBaslatan(null);
  }, [geriSayimBaslatan, ad]);

  // Harici içeriği herkeste durdur (saat dondurulur + kalıcı duruma yazılır)
  const hariciDurdur = useCallback(() => {
    const s = hSaatRef.current;
    const konum = Math.max(
      0,
      s.oynuyor ? s.taban + (Date.now() - s.ts) / 1000 : s.taban
    );
    setHSaat({ oynuyor: false, taban: konum, ts: Date.now() });
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "hariciDurdur", saniye: konum },
    });
    if (supabase && odaIdRef.current) {
      supabase
        .from("rooms")
        .update({
          is_playing: false,
          playback_time: konum,
          updated_at: new Date().toISOString(),
        })
        .eq("id", odaIdRef.current)
        .then(() => {});
    }
  }, []);

  // Odanın kalıcı durumunu okuyup kendi oynatıcını herkese hizalar
  async function senkronla() {
    if (!oda || !supabase) return;
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", oda.id)
      .maybeSingle();
    if (!data) return;
    const guncel = data as Oda;
    if (guncel.video_url !== oda.video_url) {
      baslangicSaniyeRef.current = 0;
      setOda(guncel);
      return;
    }
    let konum = guncel.playback_time;
    if (guncel.is_playing) {
      konum += (Date.now() - Date.parse(guncel.updated_at)) / 1000;
      oynaticiRef.current?.oynat(Math.max(0, konum));
    } else {
      oynaticiRef.current?.duraklat(Math.max(0, konum));
    }
  }

  const sahneRef = useRef<HTMLDivElement>(null);

  function tamEkran() {
    const alan = sahneRef.current;
    if (!alan) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      alan.requestFullscreen().catch(() => {});
    }
  }

  function davetKopyala() {
    navigator.clipboard
      .writeText(`${window.location.origin}/oda/${odaKodu}`)
      .then(() => {
        setKopyalandi(true);
        setTimeout(() => setKopyalandi(false), 2000);
      });
  }

  if (!supabase) return <KurulumEksik />;

  if (durum === "yukleniyor") {
    return (
      <main className="huzme flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
        <p className="nabiz text-sm text-soluk">Salon hazırlanıyor…</p>
        {gecikmeUyarisi && (
          <p className="max-w-sm text-center text-xs text-soluk/70">
            Uzun sürdüyse internet bağlantını ve Vercel/Supabase ayarlarını
            kontrol edip sayfayı yenile.
          </p>
        )}
      </main>
    );
  }

  if (durum === "bulunamadi") {
    return (
      <main className="huzme flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <h1 className="font-display text-3xl font-bold">Oda bulunamadı 🎞️</h1>
        <p className="text-sm text-soluk">
          <span className="font-semibold text-amber">{odaKodu}</span> kodlu bir
          oda yok ya da kapanmış.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-perde"
        >
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  // Takma ad kapısı
  if (!ad) {
    return (
      <main className="huzme flex min-h-dvh items-center justify-center p-6">
        <div className="bilet w-full max-w-sm rounded-2xl bg-koltuk p-6">
          <h1 className="font-display text-xl font-bold">
            {oda?.name ?? "Odaya katıl"}
          </h1>
          <p className="mt-1 text-xs text-soluk">
            Salona girmek için bir takma ad seç.
          </p>
          <input
            value={adTaslak}
            onChange={(e) => setAdTaslak(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && adTaslak.trim()) {
                takmaAdKaydet(adTaslak);
                setAd(adTaslak.trim());
              }
            }}
            placeholder="Takma adın"
            maxLength={20}
            autoFocus
            className="mt-4 w-full rounded-lg border border-cizgi bg-perde px-3 py-2.5 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60"
          />
          <button
            onClick={() => {
              if (!adTaslak.trim()) return;
              takmaAdKaydet(adTaslak);
              setAd(adTaslak.trim());
            }}
            className="mt-3 w-full rounded-lg bg-amber py-2.5 text-sm font-bold text-perde transition hover:brightness-110"
          >
            Salona gir
          </button>
        </div>
      </main>
    );
  }

  const ytId = oda?.video_url ? youtubeIdAyikla(oda.video_url) : null;
  const youtubeModu = oda?.video_type === "youtube" && ytId;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-cizgi bg-koltuk px-4 py-2.5">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight"
        >
          Rve<span className="text-amber">.</span>
        </Link>
        <span className="hidden truncate text-sm text-soluk sm:block">
          {oda?.name}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={davetKopyala}
            className="rounded-lg border border-dashed border-amber/50 px-3 py-1.5 font-display text-xs font-semibold tracking-[0.25em] text-amber transition hover:bg-amber/10"
            title="Davet linkini kopyala"
          >
            {kopyalandi ? "KOPYALANDI ✓" : odaKodu}
          </button>
          <button
            onClick={() => setSinemaModu((s) => !s)}
            className="rounded-lg border border-cizgi px-3 py-1.5 text-xs text-isik transition hover:border-amber/60"
            title="Sohbeti gizle/göster"
          >
            {sinemaModu ? "Sohbeti göster" : "Sinema modu"}
          </button>
          <button
            onClick={tamEkran}
            className="rounded-lg border border-cizgi px-3 py-1.5 text-xs text-isik transition hover:border-amber/60"
            title="Tam ekran"
          >
            ⛶ Tam ekran
          </button>
          <button
            onClick={cikisYap}
            className="rounded-lg border border-cizgi px-3 py-1.5 text-xs text-soluk transition hover:border-red-500/60 hover:text-red-400"
            title="Odadan ayrıl (son kişiysen oda silinir)"
          >
            Çıkış
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div ref={sahneRef} className="relative min-h-0 flex-1 bg-black">
            {oda?.video_url ? (
              youtubeModu ? (
                <YouTubeOynatici
                  ref={oynaticiRef}
                  videoId={ytId!}
                  baslangicSaniye={baslangicSaniyeRef.current}
                  onYerelOlay={yerelOlay}
                />
              ) : (
                <HariciIzleyici
                  url={oda.video_url}
                  servis={yayinServisi(oda.video_url)}
                  oynuyor={hSaat.oynuyor}
                  taban={hSaat.taban}
                  ts={hSaat.ts}
                  onGeriSayim={geriSayimBaslat}
                  onDurdur={hariciDurdur}
                />
              )
            ) : (
              <div className="huzme flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="text-4xl">🎬</span>
                <p className="font-display text-xl font-semibold">
                  Perde kapalı
                </p>
                <p className="max-w-sm text-sm text-soluk">
                  Aşağıya bir YouTube linki ya da film sitesi adresi yapıştır —
                  odadaki herkeste aynı anda açılır.
                </p>
              </div>
            )}
            {geriSayimBaslatan && (
              <GeriSayim baslatan={geriSayimBaslatan} onBitti={geriSayimBitti} />
            )}
          </div>

          <div className="flex gap-2 border-t border-cizgi bg-koltuk p-3">
            <input
              value={videoGirdi}
              onChange={(e) => setVideoGirdi(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && videoDegistir()}
              placeholder="YouTube linki veya film sitesi adresi yapıştır…"
              className="min-w-0 flex-1 rounded-lg border border-cizgi bg-perde px-3 py-2 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60"
            />
            <button
              onClick={videoDegistir}
              className="rounded-lg bg-amber px-4 py-2 text-sm font-bold text-perde transition hover:brightness-110 active:scale-95"
            >
              Aç
            </button>
            {youtubeModu && (
              <button
                onClick={senkronla}
                title="Görüntün kaydıysa herkesle yeniden hizala"
                className="rounded-lg border border-cizgi px-3 py-2 text-sm text-isik transition hover:border-amber/60 hover:text-amber active:scale-95"
              >
                ⟳ Senkronla
              </button>
            )}
          </div>
        </main>

        {!sinemaModu && (
          <aside className="flex h-64 w-full flex-col border-t border-cizgi bg-koltuk md:h-auto md:w-80 md:border-l md:border-t-0">
            <Katilimcilar adlar={katilimcilar} benimAdim={ad} />
            <Sohbet
              mesajlar={mesajlar}
              benimAdim={ad}
              onGonder={mesajGonder}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
