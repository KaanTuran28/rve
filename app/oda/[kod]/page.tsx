"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  kimliktenAd,
  sahipAnahtariOku,
  videoBasligi,
} from "@/lib/supabase";
import type {
  KuyrukOgesi,
  Mesaj,
  Oda,
  OynaticiKontrol,
  SenkronOlay,
  VideoTipi,
} from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import YouTubeOynatici from "@/components/YouTubeOynatici";
import HariciIzleyici, { type EklentiDurumu } from "@/components/HariciIzleyici";
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
  // Tarayıcı eklentisi bu sekmede var mı / odaya bağlı mı
  const [eklenti, setEklenti] = useState<EklentiDurumu>("yok");
  // Kanal koptuğunda artırılır; kanal efekti yeniden kurulur
  const [baglantiSurumu, setBaglantiSurumu] = useState(0);
  // Oda sahibi anahtarı (sadece oda kuranın tarayıcısında bulunur)
  const [sahipAnahtari, setSahipAnahtari] = useState<string | null>(null);
  // Harici (Netflix vb.) ortak senkron saati: oynuyorsa gecen = taban + (now - ts)
  const [hSaat, setHSaat] = useState<{
    oynuyor: boolean;
    taban: number;
    ts: number;
  }>({ oynuyor: false, taban: 0, ts: 0 });

  // Presence kimliği: aynı takma adla girenler çakışmasın diye rastgele ek
  const kimlik = useMemo(
    () => (ad ? `${ad}#${Math.random().toString(36).slice(2, 6)}` : ""),
    [ad]
  );

  const sahibim = !!(oda?.owner_token && sahipAnahtari === oda.owner_token);
  // Kilit BENİ kısıtlıyor mu (sahip her zaman serbest)
  const kilitli = !!oda?.locked && !sahibim;

  const kanalRef = useRef<RealtimeChannel | null>(null);
  const hSaatRef = useRef(hSaat);
  hSaatRef.current = hSaat;
  const odaRef = useRef(oda);
  odaRef.current = oda;
  const kilitliRef = useRef(kilitli);
  kilitliRef.current = kilitli;
  const eklentiRef = useRef(eklenti);
  eklentiRef.current = eklenti;
  const oynaticiRef = useRef<OynaticiKontrol | null>(null);
  const odaIdRef = useRef<string | null>(null);
  const baslangicSaniyeRef = useRef(0);
  const baglantiZamaniRef = useRef(0);

  // Takma adı ve sahip anahtarını yükle
  useEffect(() => {
    setAd(takmaAdOku());
    setSahipAnahtari(sahipAnahtariOku(odaKodu));
  }, [odaKodu]);

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
  const olayIsle = useCallback(
    (olay: SenkronOlay) => {
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
        setHSaat({
          oynuyor: false,
          taban: Math.max(0, olay.saniye),
          ts: Date.now(),
        });
      } else if (olay.tur === "kuyruk") {
        setOda((onceki) =>
          onceki ? { ...onceki, queue: olay.kuyruk } : onceki
        );
      } else if (olay.tur === "kilit") {
        setOda((onceki) =>
          onceki ? { ...onceki, locked: olay.kilitli } : onceki
        );
        sistemMesaji(
          olay.kilitli
            ? "Oda sahibi kontrolleri kilitledi 🔒"
            : "Oda sahibi kilidi açtı 🔓"
        );
      }
    },
    [sistemMesaji]
  );

  // Odanın güncel halini DB'den çekip yerel durumu hizalar.
  // Kopukluk sonrası ve sekme öne gelince çağrılır; kaçırılan broadcast'leri telafi eder.
  const durumTazele = useCallback(async (mesajlariTazele = false) => {
    if (!supabase || !odaIdRef.current) return;
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", odaIdRef.current)
      .maybeSingle();
    if (!data) {
      // Oda biz yokken kapanmış
      setDurum("bulunamadi");
      return;
    }
    const guncel = data as Oda;
    const oncekiUrl = odaRef.current?.video_url ?? null;
    setOda(guncel);
    if (guncel.video_type === "external") {
      let gecen = guncel.playback_time;
      if (guncel.is_playing) {
        gecen += (Date.now() - Date.parse(guncel.updated_at)) / 1000;
      }
      setHSaat({
        oynuyor: guncel.is_playing,
        taban: Math.max(0, gecen),
        ts: Date.now(),
      });
    } else if (guncel.video_url !== oncekiUrl) {
      baslangicSaniyeRef.current = 0;
    } else if (guncel.video_url) {
      let konum = guncel.playback_time;
      if (guncel.is_playing) {
        konum += (Date.now() - Date.parse(guncel.updated_at)) / 1000;
        oynaticiRef.current?.oynat(Math.max(0, konum));
      } else {
        oynaticiRef.current?.duraklat(Math.max(0, konum));
      }
    }
    if (mesajlariTazele) {
      const { data: gecmis } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", odaIdRef.current)
        .order("created_at", { ascending: false })
        .limit(100);
      if (gecmis) setMesajlar([...(gecmis as Mesaj[])].reverse());
    }
  }, []);

  // Gerçek zamanlı kanal (oda başına bir tane; baglantiSurumu artınca yeniden kurulur)
  useEffect(() => {
    if (!supabase || !oda?.id || !kimlik) return;
    let kapatildi = false;
    let yenidenPlanlandi = false;
    const kanal = supabase.channel(`oda:${odaKodu}`, {
      config: { broadcast: { self: false }, presence: { key: kimlik } },
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
        if (key !== kimlik && Date.now() - baglantiZamaniRef.current > 3000) {
          sistemMesaji(`${kimliktenAd(key)} salona katıldı 🎟️`);
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key !== kimlik) sistemMesaji(`${kimliktenAd(key)} salondan ayrıldı`);
      })
      .subscribe((kanalDurumu) => {
        if (kanalDurumu === "SUBSCRIBED") {
          baglantiZamaniRef.current = Date.now();
          kanal.track({ katildi: Date.now() });
          // Yeniden bağlandıysak kopuklukta kaçanları DB'den topla
          if (baglantiSurumu > 0) durumTazele(true);
        } else if (
          !kapatildi &&
          !yenidenPlanlandi &&
          (kanalDurumu === "CHANNEL_ERROR" ||
            kanalDurumu === "TIMED_OUT" ||
            kanalDurumu === "CLOSED")
        ) {
          // Kanal koptu: kısa bekleyip baştan kur
          yenidenPlanlandi = true;
          setTimeout(() => {
            if (!kapatildi) setBaglantiSurumu((s) => s + 1);
          }, 2000);
        }
      });
    kanalRef.current = kanal;
    return () => {
      kapatildi = true;
      kanalRef.current = null;
      supabase!.removeChannel(kanal);
    };
  }, [
    oda?.id,
    kimlik,
    odaKodu,
    olayIsle,
    sistemMesaji,
    baglantiSurumu,
    durumTazele,
  ]);

  // Sekme öne gelince / ağ dönünce: kanal koptuysa yeniden kur, durumu tazele
  useEffect(() => {
    const kontrolEt = () => {
      const kanal = kanalRef.current;
      if (kanal && String(kanal.state) !== "joined") {
        setBaglantiSurumu((s) => s + 1);
      } else {
        durumTazele();
      }
    };
    const gorunurluk = () => {
      if (document.visibilityState === "visible") kontrolEt();
    };
    const cevrimici = () => {
      // Soket kendi kendine toparlanabilir; kısa bekleyip kontrol et
      setTimeout(kontrolEt, 1500);
    };
    document.addEventListener("visibilitychange", gorunurluk);
    window.addEventListener("online", cevrimici);
    return () => {
      document.removeEventListener("visibilitychange", gorunurluk);
      window.removeEventListener("online", cevrimici);
    };
  }, [durumTazele]);

  // Tarayıcı eklentisi köprüsü: content script varsa ping'e pong döner
  useEffect(() => {
    const dinle = (e: MessageEvent) => {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.__rve === "pong") {
        setEklenti((d) => (d === "bagli" ? d : "var"));
      } else if (e.data.__rve === "bagliOk") {
        setEklenti("bagli");
      }
    };
    window.addEventListener("message", dinle);
    // content script geç enjekte olabilir: birkaç kez yokla
    const zamanlayicilar = [300, 1500, 4000].map((ms) =>
      setTimeout(() => window.postMessage({ __rve: "ping" }, "*"), ms)
    );
    return () => {
      window.removeEventListener("message", dinle);
      zamanlayicilar.forEach(clearTimeout);
    };
  }, []);

  const eklentiyeBaglan = useCallback(() => {
    window.postMessage({ __rve: "baglan", kod: odaKodu }, "*");
  }, [odaKodu]);

  // Presence'ta benden başka kimse yoksa odanın son üyesiyim
  const sonUyeyMiyim = useCallback(() => {
    const kanal = kanalRef.current;
    if (!kanal) return false;
    return Object.keys(kanal.presenceState()).length <= 1;
  }, []);

  // Çıkışta / son üyeyken odayı ve mesajlarını DB'den sil (mesajlar FK cascade ile gider)
  const cikisYap = useCallback(async () => {
    const kanal = kanalRef.current;
    // Bu sekmeden bağlanan eklenti varsa onu da odadan ayır
    if (eklentiRef.current === "bagli") {
      window.postMessage({ __rve: "kapat" }, "*");
    }
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
    // Oda kilitli ve sahip değilsem oynat/duraklat odaya yayılmaz (yerelde kalır)
    if (
      kilitliRef.current &&
      (olay.tur === "oynat" || olay.tur === "duraklat")
    ) {
      return;
    }
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

  function girdiCozumle(girdi: string): {
    url: string;
    videoTipi: VideoTipi;
    ytId: string | null;
  } {
    const ytId = youtubeIdAyikla(girdi);
    const videoTipi: VideoTipi = ytId ? "youtube" : "external";
    const url = ytId
      ? girdi
      : girdi.startsWith("http")
        ? girdi
        : `https://${girdi}`;
    return { url, videoTipi, ytId };
  }

  // Videoyu değiştirip kuyruğu yazar: yerel durum + broadcast + DB tek yerden
  async function videoyuUygula(
    url: string,
    videoTipi: VideoTipi,
    yeniKuyruk: KuyrukOgesi[]
  ) {
    const mevcut = odaRef.current;
    if (!mevcut || !supabase) return;
    baslangicSaniyeRef.current = 0;
    setHSaat({ oynuyor: false, taban: 0, ts: 0 });
    setOda({
      ...mevcut,
      video_url: url,
      video_type: videoTipi,
      is_playing: false,
      playback_time: 0,
      queue: yeniKuyruk,
    });
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "video", url, videoTipi },
    });
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "kuyruk", kuyruk: yeniKuyruk },
    });
    await supabase
      .from("rooms")
      .update({
        video_url: url,
        video_type: videoTipi,
        is_playing: false,
        playback_time: 0,
        queue: yeniKuyruk,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mevcut.id);
  }

  async function videoDegistir() {
    const girdi = videoGirdi.trim();
    if (!girdi || !oda || !supabase || kilitli) return;
    const { url, videoTipi } = girdiCozumle(girdi);
    setVideoGirdi("");
    await videoyuUygula(url, videoTipi, oda.queue ?? []);
  }

  // Kuyruğu yerel + broadcast + DB olarak yazar
  async function kuyrukYaz(yeniKuyruk: KuyrukOgesi[]) {
    const mevcut = odaRef.current;
    if (!mevcut || !supabase) return;
    setOda({ ...mevcut, queue: yeniKuyruk });
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "kuyruk", kuyruk: yeniKuyruk },
    });
    await supabase
      .from("rooms")
      .update({ queue: yeniKuyruk })
      .eq("id", mevcut.id);
  }

  async function kuyrugaEkle() {
    const girdi = videoGirdi.trim();
    if (!girdi || !oda || !supabase || kilitli) return;
    const { url, videoTipi, ytId } = girdiCozumle(girdi);
    setVideoGirdi("");
    let etiket: string;
    if (ytId) {
      etiket =
        (await videoBasligi(`https://www.youtube.com/watch?v=${ytId}`)) ??
        `YouTube · ${ytId}`;
    } else {
      try {
        etiket = new URL(url).hostname;
      } catch {
        etiket = url;
      }
    }
    // Başlık beklerken kuyruk değişmiş olabilir; en güncel halin üstüne ekle
    await kuyrukYaz([
      ...(odaRef.current?.queue ?? []),
      { url, videoTipi, etiket },
    ]);
  }

  async function kuyruktanSil(sira: number) {
    if (kilitli) return;
    const kuyruk = odaRef.current?.queue ?? [];
    await kuyrukYaz(kuyruk.filter((_, i) => i !== sira));
  }

  async function kuyruktanOynat(sira: number) {
    if (kilitli) return;
    const kuyruk = odaRef.current?.queue ?? [];
    const oge = kuyruk[sira];
    if (!oge) return;
    await videoyuUygula(
      oge.url,
      oge.videoTipi,
      kuyruk.filter((_, i) => i !== sira)
    );
  }

  // Video bitince kuyruktan sıradakine geç. Herkes dener; DB'deki koşullu
  // güncelleme (video_url hâlâ eskiyse) sayesinde sadece ilk yazan kazanır.
  const videoBitti = useCallback(async () => {
    const mevcut = odaRef.current;
    if (!mevcut || !supabase || !mevcut.video_url) return;
    const kuyruk = mevcut.queue ?? [];
    if (kuyruk.length === 0) return;
    const [siradaki, ...kalan] = kuyruk;
    const { data } = await supabase
      .from("rooms")
      .update({
        video_url: siradaki.url,
        video_type: siradaki.videoTipi,
        is_playing: false,
        playback_time: 0,
        queue: kalan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mevcut.id)
      .eq("video_url", mevcut.video_url)
      .select();
    if (!data || data.length === 0) return; // başka bir katılımcı geçti
    baslangicSaniyeRef.current = 0;
    setHSaat({ oynuyor: false, taban: 0, ts: 0 });
    setOda(data[0] as Oda);
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "video", url: siradaki.url, videoTipi: siradaki.videoTipi },
    });
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "kuyruk", kuyruk: kalan },
    });
  }, []);

  // Oda sahibi kilidi aç/kapat
  async function kilidiDegistir() {
    const mevcut = odaRef.current;
    if (!mevcut || !supabase || !sahibim) return;
    const yeni = !mevcut.locked;
    setOda({ ...mevcut, locked: yeni });
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "kilit", kilitli: yeni },
    });
    await supabase.from("rooms").update({ locked: yeni }).eq("id", mevcut.id);
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
    if (kilitliRef.current) return;
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
    if (kilitliRef.current) return;
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
    await durumTazele();
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
                setAd(takmaAdOku());
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
              setAd(takmaAdOku());
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
  const kuyruk = oda?.queue ?? [];

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
          {sahibim && (
            <button
              onClick={kilidiDegistir}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                oda?.locked
                  ? "border-amber/60 text-amber"
                  : "border-cizgi text-isik hover:border-amber/60"
              }`}
              title={
                oda?.locked
                  ? "Kilidi aç: herkes videoyu kontrol edebilsin"
                  : "Kilitle: videoyu sadece sen kontrol et"
              }
            >
              {oda?.locked ? "🔒 Kilitli" : "🔓 Serbest"}
            </button>
          )}
          {!sahibim && oda?.locked && (
            <span
              className="rounded-lg bg-kadife px-2.5 py-1.5 text-xs text-soluk"
              title="Oda kilitli: video kontrolleri oda sahibinde"
            >
              🔒
            </span>
          )}
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
                  onBitti={videoBitti}
                />
              ) : (
                <HariciIzleyici
                  url={oda.video_url}
                  servis={yayinServisi(oda.video_url)}
                  oynuyor={hSaat.oynuyor}
                  taban={hSaat.taban}
                  ts={hSaat.ts}
                  kilitli={kilitli}
                  eklenti={eklenti}
                  onEklentiBaglan={eklentiyeBaglan}
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
              disabled={kilitli}
              placeholder={
                kilitli
                  ? "🔒 Oda kilitli — videoyu oda sahibi seçiyor"
                  : "YouTube linki veya film sitesi adresi yapıştır…"
              }
              className="min-w-0 flex-1 rounded-lg border border-cizgi bg-perde px-3 py-2 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60 disabled:opacity-60"
            />
            <button
              onClick={videoDegistir}
              disabled={kilitli}
              className="rounded-lg bg-amber px-4 py-2 text-sm font-bold text-perde transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              Aç
            </button>
            <button
              onClick={kuyrugaEkle}
              disabled={kilitli}
              title="Videoyu şimdi açma, sıraya ekle — mevcut video bitince otomatik geçer"
              className="rounded-lg border border-cizgi px-3 py-2 text-sm text-isik transition hover:border-amber/60 hover:text-amber active:scale-95 disabled:opacity-50"
            >
              ＋ Sıraya
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

          {kuyruk.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-cizgi bg-koltuk px-3 pb-2.5 pt-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-soluk">
                Sırada
              </span>
              {kuyruk.map((oge, i) => (
                <span
                  key={`${oge.url}-${i}`}
                  className="flex max-w-64 items-center gap-1.5 rounded-full bg-kadife px-2.5 py-1 text-xs text-isik"
                >
                  <span className="shrink-0 text-soluk">{i + 1}.</span>
                  <span className="min-w-0 truncate" title={oge.etiket}>
                    {oge.etiket}
                  </span>
                  {!kilitli && (
                    <>
                      <button
                        onClick={() => kuyruktanOynat(i)}
                        title="Şimdi oynat"
                        className="shrink-0 text-amber transition hover:brightness-125"
                      >
                        ▶
                      </button>
                      <button
                        onClick={() => kuyruktanSil(i)}
                        title="Sıradan çıkar"
                        className="shrink-0 text-soluk transition hover:text-red-400"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </span>
              ))}
            </div>
          )}
        </main>

        {!sinemaModu && (
          <aside className="flex h-64 w-full flex-col border-t border-cizgi bg-koltuk md:h-auto md:w-80 md:border-l md:border-t-0">
            <Katilimcilar kimlikler={katilimcilar} benimKimlik={kimlik} />
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
