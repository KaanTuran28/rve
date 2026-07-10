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
  EklentiDurumu,
  KuyrukOgesi,
  Mesaj,
  Oda,
  OynaticiKontrol,
  SenkronOlay,
  VideoTipi,
} from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import YouTubeOynatici from "@/components/YouTubeOynatici";
import HariciIzleyici from "@/components/HariciIzleyici";
import FilmPaneli from "@/components/FilmPaneli";
import Sohbet from "@/components/Sohbet";
import MesajBaloncugu from "@/components/MesajBaloncugu";
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
  // Sinema modunda (sohbet gizliyken) gelen mesaj sayısı — düğmede rozet
  const [okunmamis, setOkunmamis] = useState(0);
  const [videoGirdi, setVideoGirdi] = useState("");
  const [kopyalandi, setKopyalandi] = useState(false);
  const [gecikmeUyarisi, setGecikmeUyarisi] = useState(false);
  // Video üstünde kısa "kim ne yaptı" bildirimi ("kaan duraklattı ⏸")
  const [bildirim, setBildirim] = useState<string | null>(null);
  // Sohbette "X yazıyor…" göstergesi
  const [yazanlar, setYazanlar] = useState<string[]>([]);
  // iPhone Safari element tam ekranı desteklemez; düğme gizlenir
  const [tamEkranVar, setTamEkranVar] = useState(true);
  // Tam ekran türü — "sahne": bizim ⛶ (kayanlar + baloncuk sahnenin içinde,
  // tam ekran öğesinin alt ağacında oldukları için tıklanabilir); "yabanci":
  // harici sitenin/YouTube'un OYNATICISININ kendi tam ekranı (fullscreenElement
  // = iframe; kayanlar popover'la üstüne çizilir ama Chromium top-layer
  // popover'a boyamayı verip HIT-TEST'i vermiyor → tıklanabilir baloncuk
  // gösterilemez, sadece görsel katman olur)
  const [tamEkranTuru, setTamEkranTuru] = useState<null | "sahne" | "yabanci">(
    null
  );
  const tamEkranda = tamEkranTuru !== null;
  // Yabancı tam ekranın başında kısa "nasıl yazarım" ipucu
  const [fsIpucu, setFsIpucu] = useState(false);
  // Popover API var mı (mount'ta set: hydration uyumu)
  const [popoverVar, setPopoverVar] = useState(false);
  // Tam ekranda video üstünde kayan mesajlar (danmaku)
  const [kayanlar, setKayanlar] = useState<
    { id: string; ad: string; metin: string; serit: number }[]
  >([]);
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
  // Oda sahibi beni susturdu mu (sohbete yazamam)
  const susturuldum = !sahibim && !!ad && (oda?.muted ?? []).includes(ad);

  const kanalRef = useRef<RealtimeChannel | null>(null);
  const hSaatRef = useRef(hSaat);
  hSaatRef.current = hSaat;
  const odaRef = useRef(oda);
  odaRef.current = oda;
  const kilitliRef = useRef(kilitli);
  kilitliRef.current = kilitli;
  const eklentiRef = useRef(eklenti);
  eklentiRef.current = eklenti;
  const sinemaModuRef = useRef(sinemaModu);
  sinemaModuRef.current = sinemaModu;
  const tamEkrandaRef = useRef(tamEkranda);
  tamEkrandaRef.current = tamEkranda;
  const susturuldumRef = useRef(susturuldum);
  susturuldumRef.current = susturuldum;
  const kayanSiraRef = useRef(0);
  const oynaticiRef = useRef<OynaticiKontrol | null>(null);
  const odaIdRef = useRef<string | null>(null);
  const baslangicSaniyeRef = useRef(0);
  // baslangicSaniye'nin hesaplandığı an + "oda o an oynuyordu" bayrağı
  // (geç katılan için sessiz otomatik başlatma)
  const baslangicTsRef = useRef(0);
  const otomatikBaslatRef = useRef(false);
  const baglantiZamaniRef = useRef(0);
  const adRef = useRef(ad);
  adRef.current = ad;
  const bildirimZamanRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const yazanSonaErmeRef = useRef<Map<string, number>>(new Map());
  const sonYaziyorRef = useRef(0);

  // Takma adı ve sahip anahtarını yükle
  useEffect(() => {
    setAd(takmaAdOku());
    setSahipAnahtari(sahipAnahtariOku(odaKodu));
    const belge = document as Document & { webkitFullscreenEnabled?: boolean };
    setTamEkranVar(!!(document.fullscreenEnabled || belge.webkitFullscreenEnabled));
    setPopoverVar("showPopover" in HTMLElement.prototype);
  }, [odaKodu]);

  const sahneRef = useRef<HTMLDivElement>(null);
  // Yabancı tam ekran katmanının popover kabı (yalnız popoverVar iken render edilir)
  const fsKatmanRef = useRef<HTMLDivElement>(null);
  const fsIpucuZamanRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tam ekran durumunu izle (Esc ile de çıkılabildiği için olaydan dinlenir).
  // Harici sitenin/YouTube'un oynatıcısı iframe içinden tam ekran istediğinde
  // de burası tetiklenir (fullscreenElement = iframe) — "yabanci" sayılır.
  useEffect(() => {
    const degisti = () => {
      const fs = document.fullscreenElement;
      const tur = fs ? (fs === sahneRef.current ? "sahne" : "yabanci") : null;
      setTamEkranTuru(tur);
      // Top layer'da sıralama ekleme anına göre: popover'ı tam ekran
      // öğesinden SONRA (yeniden) aç ki kayan mesajlar onun üstünde çizilsin.
      const katman = fsKatmanRef.current;
      if (katman) {
        try {
          katman.hidePopover();
        } catch {
          /* zaten kapalıysa hidePopover fırlatır — önemsiz */
        }
        if (tur === "yabanci") {
          try {
            katman.showPopover();
          } catch {
            /* açılamazsa kayanlar iframe'in altında kalır (eski davranış) */
          }
        }
      }
      // İpucu: yabancı tam ekranın ilk saniyelerinde nasıl yazılacağını söyle
      if (fsIpucuZamanRef.current) clearTimeout(fsIpucuZamanRef.current);
      setFsIpucu(tur === "yabanci");
      if (tur === "yabanci") {
        fsIpucuZamanRef.current = setTimeout(() => setFsIpucu(false), 6000);
      }
    };
    document.addEventListener("fullscreenchange", degisti);
    return () => document.removeEventListener("fullscreenchange", degisti);
  }, []);

  // Tam ekrandayken mesajı video üstünde kayan şerit olarak göster
  const kayanEkle = useCallback((mesajAd: string, metin: string) => {
    if (!tamEkrandaRef.current) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const serit = kayanSiraRef.current++ % 5;
    const kisa = metin.length > 90 ? `${metin.slice(0, 90)}…` : metin;
    setKayanlar((k) => [...k.slice(-14), { id, ad: mesajAd, metin: kisa, serit }]);
    // Animasyon 9 sn; payı olsun diye 10 sn sonra listeden düş
    setTimeout(
      () => setKayanlar((k) => k.filter((x) => x.id !== id)),
      10000
    );
  }, []);

  // Video üstünde 2.6 sn görünen bildirim
  const bildirimGoster = useCallback((metin: string) => {
    setBildirim(metin);
    if (bildirimZamanRef.current) clearTimeout(bildirimZamanRef.current);
    bildirimZamanRef.current = setTimeout(() => setBildirim(null), 2600);
  }, []);

  // "X yazıyor…" — gelen sinyali 3 sn tut, süresi dolanları ayıkla
  const yazanEkle = useCallback((yazan: string) => {
    yazanSonaErmeRef.current.set(yazan, Date.now() + 3000);
    setYazanlar([...yazanSonaErmeRef.current.keys()]);
  }, []);

  useEffect(() => {
    if (yazanlar.length === 0) return;
    const zaman = setInterval(() => {
      const simdi = Date.now();
      let degisti = false;
      for (const [kisi, sure] of yazanSonaErmeRef.current) {
        if (sure < simdi) {
          yazanSonaErmeRef.current.delete(kisi);
          degisti = true;
        }
      }
      if (degisti) setYazanlar([...yazanSonaErmeRef.current.keys()]);
    }, 1000);
    return () => clearInterval(zaman);
  }, [yazanlar.length]);

  // Yazarken en fazla 2 sn'de bir yayınla
  const yaziyorBildir = useCallback(() => {
    const simdi = Date.now();
    if (simdi - sonYaziyorRef.current < 2000) return;
    sonYaziyorRef.current = simdi;
    kanalRef.current?.send({
      type: "broadcast",
      event: "yaziyor",
      payload: { ad: adRef.current },
    });
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
      baslangicTsRef.current = Date.now();
      otomatikBaslatRef.current = odaVerisi.is_playing;
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
        if (olay.kim) bildirimGoster(`▶ ${olay.kim} oynattı`);
      } else if (olay.tur === "duraklat") {
        oynaticiRef.current?.duraklat(olay.saniye);
        if (olay.kim) bildirimGoster(`⏸ ${olay.kim} duraklattı`);
      } else if (olay.tur === "video") {
        // kim yoksa kuyruk otomatik geçişidir (videoBitti kazananı yayınlar)
        bildirimGoster(
          olay.kim
            ? `🎬 ${olay.kim} yeni video açtı`
            : "🎬 Sıradaki videoya geçildi"
        );
        baslangicSaniyeRef.current = 0;
        otomatikBaslatRef.current = false;
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
        if (olay.kim) bildirimGoster(`⏸ ${olay.kim} durdurdu`);
        setHSaat({
          oynuyor: false,
          taban: Math.max(0, olay.saniye),
          ts: Date.now(),
        });
      } else if (olay.tur === "kuyruk") {
        if (olay.kim) bildirimGoster(`🎞 ${olay.kim} sırayı güncelledi`);
        setOda((onceki) =>
          onceki ? { ...onceki, queue: olay.kuyruk } : onceki
        );
      } else if (olay.tur === "kilit") {
        setOda((onceki) =>
          onceki ? { ...onceki, locked: olay.kilitli } : onceki
        );
        bildirimGoster(olay.kilitli ? "🔒 Oda kilitlendi" : "🔓 Kilit açıldı");
        sistemMesaji(
          olay.kilitli
            ? "Oda sahibi kontrolleri kilitledi 🔒"
            : "Oda sahibi kilidi açtı 🔓"
        );
      } else if (olay.tur === "sustur") {
        const onceki = odaRef.current?.muted ?? [];
        setOda((o) => (o ? { ...o, muted: olay.adlar } : o));
        for (const a of olay.adlar.filter((a) => !onceki.includes(a))) {
          sistemMesaji(`${a} oda sahibi tarafından susturuldu 🔇`);
          if (a === adRef.current) bildirimGoster("🔇 Oda sahibi seni susturdu");
        }
        for (const a of onceki.filter((a) => !olay.adlar.includes(a))) {
          sistemMesaji(`${a} yeniden konuşabilir 🔊`);
          if (a === adRef.current)
            bildirimGoster("🔊 Susturman kaldırıldı");
        }
      }
    },
    [sistemMesaji, bildirimGoster]
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
      otomatikBaslatRef.current = false;
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
      .on("broadcast", { event: "mesaj" }, ({ payload }) => {
        const gelen = payload as Mesaj;
        setMesajlar((m) => [...m, gelen]);
        // Sohbet gizliyken gelenler rozete sayılır
        if (sinemaModuRef.current) setOkunmamis((n) => n + 1);
        // Tam ekrandaysa video üstünde kayarak geçer
        kayanEkle(gelen.nickname, gelen.content);
      })
      .on("broadcast", { event: "mesajSil" }, ({ payload }) => {
        const { id, deleted_at } = payload as { id: string; deleted_at: string };
        setMesajlar((m) =>
          m.map((x) =>
            x.id === id ? { ...x, content: "silindi", deleted_at } : x
          )
        );
      })
      .on("broadcast", { event: "mesajDuzenle" }, ({ payload }) => {
        const yeni = payload as Pick<Mesaj, "id" | "content" | "edited_at">;
        setMesajlar((m) =>
          m.map((x) =>
            x.id === yeni.id
              ? { ...x, content: yeni.content, edited_at: yeni.edited_at }
              : x
          )
        );
      })
      .on("broadcast", { event: "yaziyor" }, ({ payload }) => {
        const yazan = (payload as { ad?: string })?.ad;
        if (yazan && yazan !== adRef.current) yazanEkle(yazan);
      })
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
    yazanEkle,
    kayanEkle,
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

  // Bağlıyken çipe tekrar basınca eklenti odadan ayrılır
  const eklentiKapat = useCallback(() => {
    window.postMessage({ __rve: "kapat" }, "*");
    setEklenti("var");
  }, []);

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

  // Kilitliyken oynat/duraklat denemesi: oynatıcı kendini geri aldı, haber ver
  const kilitliDeneme = useCallback(() => {
    bildirimGoster("🔒 Kontroller oda sahibinde");
  }, [bildirimGoster]);

  // Oynatıcıdan gelen yerel olayları yayınla + kalıcı duruma yaz
  const yerelOlay = useCallback((olay: SenkronOlay) => {
    // Oda kilitliyken sahip olmayan kimse oynatamaz/durduramaz — kendi
    // ekranında bile. Deneme yayılmaz; oynatıcı DB'deki oda durumuna döndürülür.
    if (
      kilitliRef.current &&
      (olay.tur === "oynat" || olay.tur === "duraklat")
    ) {
      bildirimGoster("🔒 Kontroller oda sahibinde");
      durumTazele();
      return;
    }
    // Karşı tarafta "kim yaptı" bildirimi çıksın diye ad iliştirilir
    const yayin =
      olay.tur === "oynat" || olay.tur === "duraklat"
        ? { ...olay, kim: adRef.current }
        : olay;
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: yayin,
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
  }, [bildirimGoster, durumTazele]);

  // Girdiyi güvenli bir URL'ye çözer; http(s) dışı her şeyde null (javascript: vb.)
  function girdiCozumle(girdi: string): {
    url: string;
    videoTipi: VideoTipi;
    ytId: string | null;
  } | null {
    const ytId = youtubeIdAyikla(girdi);
    if (ytId) {
      // Kanonik biçim: DB'deki http(s) kısıtına da uyar (çıplak ID girilebilir)
      return {
        url: `https://www.youtube.com/watch?v=${ytId}`,
        videoTipi: "youtube",
        ytId,
      };
    }
    const ham = girdi.startsWith("http") ? girdi : `https://${girdi}`;
    try {
      const cozulen = new URL(ham);
      if (cozulen.protocol !== "http:" && cozulen.protocol !== "https:") {
        return null;
      }
      return { url: cozulen.href, videoTipi: "external", ytId: null };
    } catch {
      return null;
    }
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
    otomatikBaslatRef.current = false;
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
      payload: { tur: "video", url, videoTipi, kim: adRef.current },
    });
    // kuyruk yayınında kim yok: bildirim video olayından çıkıyor, ikilenmesin
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
    const sonuc = girdiCozumle(girdi);
    if (!sonuc) {
      bildirimGoster("⚠️ Geçersiz adres — bir http(s) bağlantısı yapıştır");
      return;
    }
    setVideoGirdi("");
    await videoyuUygula(sonuc.url, sonuc.videoTipi, oda.queue ?? []);
  }

  // Kuyruğu yerel + broadcast + DB olarak yazar
  async function kuyrukYaz(yeniKuyruk: KuyrukOgesi[]) {
    const mevcut = odaRef.current;
    if (!mevcut || !supabase) return;
    setOda({ ...mevcut, queue: yeniKuyruk });
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "kuyruk", kuyruk: yeniKuyruk, kim: adRef.current },
    });
    await supabase
      .from("rooms")
      .update({ queue: yeniKuyruk })
      .eq("id", mevcut.id);
  }

  async function kuyrugaEkle() {
    const girdi = videoGirdi.trim();
    if (!girdi || !oda || !supabase || kilitli) return;
    const sonuc = girdiCozumle(girdi);
    if (!sonuc) {
      bildirimGoster("⚠️ Geçersiz adres — bir http(s) bağlantısı yapıştır");
      return;
    }
    const { url, videoTipi, ytId } = sonuc;
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
    otomatikBaslatRef.current = false;
    setHSaat({ oynuyor: false, taban: 0, ts: 0 });
    setOda(data[0] as Oda);
    bildirimGoster("🎬 Sıradaki videoya geçildi");
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
  }, [bildirimGoster]);

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
    if (!oda || !supabase || susturuldumRef.current) return;
    const { data } = await supabase
      .from("messages")
      .insert({ room_id: oda.id, nickname: ad, content: metin })
      .select()
      .single();
    if (!data) return;
    setMesajlar((m) => [...m, data as Mesaj]);
    kanalRef.current?.send({ type: "broadcast", event: "mesaj", payload: data });
    kayanEkle(ad, metin);
  }

  // Kendi mesajını sil: içerik temizlenir, yerinde "silindi" izi kalır
  async function mesajSil(id: string) {
    if (!supabase) return;
    const deleted_at = new Date().toISOString();
    setMesajlar((m) =>
      m.map((x) => (x.id === id ? { ...x, content: "silindi", deleted_at } : x))
    );
    kanalRef.current?.send({
      type: "broadcast",
      event: "mesajSil",
      payload: { id, deleted_at },
    });
    await supabase
      .from("messages")
      .update({ content: "silindi", deleted_at })
      .eq("id", id);
  }

  // Kendi mesajını düzenle: içerik + düzenlendi damgası
  async function mesajDuzenle(id: string, metin: string) {
    if (!supabase) return;
    const edited_at = new Date().toISOString();
    setMesajlar((m) =>
      m.map((x) => (x.id === id ? { ...x, content: metin, edited_at } : x))
    );
    kanalRef.current?.send({
      type: "broadcast",
      event: "mesajDuzenle",
      payload: { id, content: metin, edited_at },
    });
    await supabase
      .from("messages")
      .update({ content: metin, edited_at })
      .eq("id", id);
  }

  // Oda sahibi: kişiyi sustur / susturmayı kaldır (takma ada göre)
  async function susturDegistir(hedefAd: string) {
    const mevcut = odaRef.current;
    if (!mevcut || !supabase || !sahibim) return;
    const liste = mevcut.muted ?? [];
    const susturuluyor = !liste.includes(hedefAd);
    const yeni = susturuluyor
      ? [...liste, hedefAd]
      : liste.filter((a) => a !== hedefAd);
    setOda({ ...mevcut, muted: yeni });
    sistemMesaji(
      susturuluyor
        ? `${hedefAd} oda sahibi tarafından susturuldu 🔇`
        : `${hedefAd} yeniden konuşabilir 🔊`
    );
    kanalRef.current?.send({
      type: "broadcast",
      event: "senkron",
      payload: { tur: "sustur", adlar: yeni },
    });
    await supabase.from("rooms").update({ muted: yeni }).eq("id", mevcut.id);
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
      payload: { tur: "hariciDurdur", saniye: konum, kim: adRef.current },
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

  // Tam ekranda video üstünde kayan mesajlar (danmaku) — iki yerde kullanılır:
  // sahne tam ekranında sahnenin içinde, yabancı (site oynatıcısının kendi)
  // tam ekranında popover katmanında.
  const kayanlarKatmani = kayanlar.map((k) => (
    <div
      key={k.id}
      className="kayan-mesaj z-20 rounded-full bg-perde/70 px-3.5 py-1.5 text-sm text-isik shadow-lg backdrop-blur-sm"
      style={{ top: `${7 + k.serit * 9}%` }}
    >
      <span className="font-semibold text-amber">{k.ad}</span>
      <span className="ml-2">{k.metin}</span>
    </div>
  ));
  // Sahne (bizim ⛶) tam ekranı: baloncuk tıklanabilir — tam ekran öğesinin
  // alt ağacında. Popover'sız eski tarayıcıda her tam ekranda burada kalır.
  const sahneIciKatman = (tamEkranTuru === "sahne" ||
    (!popoverVar && tamEkranda)) && (
    <>
      {kayanlarKatmani}
      <MesajBaloncugu susturuldum={susturuldum} onGonder={mesajGonder} />
    </>
  );

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-cizgi bg-koltuk px-3 py-2.5 sm:gap-3 sm:px-4">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight"
        >
          Rve<span className="text-amber">.</span>
        </Link>
        <span className="hidden truncate text-sm text-soluk sm:block">
          {oda?.name}
        </span>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {sahibim && (
            <button
              onClick={kilidiDegistir}
              className={`rounded-lg border px-2 py-1.5 text-xs transition sm:px-3 ${
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
              {oda?.locked ? "🔒" : "🔓"}
              <span className="hidden sm:inline">
                {oda?.locked ? " Kilitli" : " Serbest"}
              </span>
            </button>
          )}
          {!sahibim && oda?.locked && (
            <span
              className="rounded-lg bg-kadife px-2 py-1.5 text-xs text-soluk sm:px-2.5"
              title="Oda kilitli: video kontrolleri oda sahibinde"
            >
              🔒
            </span>
          )}
          <button
            onClick={davetKopyala}
            className="rounded-lg border border-dashed border-amber/50 px-2 py-1.5 font-display text-xs font-semibold tracking-[0.2em] text-amber transition hover:bg-amber/10 sm:px-3 sm:tracking-[0.25em]"
            title="Davet linkini kopyala"
          >
            {kopyalandi ? "✓" : odaKodu}
          </button>
          <button
            onClick={() => {
              setSinemaModu((s) => !s);
              setOkunmamis(0);
            }}
            className="relative rounded-lg border border-cizgi px-2 py-1.5 text-xs text-isik transition hover:border-amber/60 sm:px-3"
            title={sinemaModu ? "Sohbeti göster" : "Sinema modu: sohbeti gizle"}
          >
            <span className="sm:hidden">{sinemaModu ? "💬" : "🎬"}</span>
            <span className="hidden sm:inline">
              {sinemaModu ? "Sohbeti göster" : "Sinema modu"}
            </span>
            {sinemaModu && okunmamis > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold leading-none text-perde">
                {okunmamis > 9 ? "9+" : okunmamis}
              </span>
            )}
          </button>
          {tamEkranVar && (
            <button
              onClick={tamEkran}
              className="rounded-lg border border-cizgi px-2 py-1.5 text-xs text-isik transition hover:border-amber/60 sm:px-3"
              title="Tam ekran"
            >
              ⛶<span className="hidden sm:inline"> Tam ekran</span>
            </button>
          )}
          <button
            onClick={cikisYap}
            className="rounded-lg border border-cizgi px-2 py-1.5 text-xs text-soluk transition hover:border-red-500/60 hover:text-red-400 sm:px-3"
            title="Odadan ayrıl (son kişiysen oda silinir)"
          >
            Çıkış
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {oda?.video_url && (
            <FilmPaneli
              url={oda.video_url}
              videoTipi={oda.video_type}
              servis={yayinServisi(oda.video_url)}
              oynuyor={hSaat.oynuyor}
              taban={hSaat.taban}
              ts={hSaat.ts}
              kilitli={kilitli}
              eklenti={eklenti}
              onEklentiBaglan={eklentiyeBaglan}
              onEklentiKapat={eklentiKapat}
              onGeriSayim={geriSayimBaslat}
              onDurdur={hariciDurdur}
            />
          )}
          <div ref={sahneRef} className="relative min-h-0 flex-1 bg-black">
            {oda?.video_url ? (
              youtubeModu ? (
                <YouTubeOynatici
                  ref={oynaticiRef}
                  videoId={ytId!}
                  baslangicSaniye={baslangicSaniyeRef.current}
                  baslangicTs={baslangicTsRef.current}
                  otomatikBaslat={otomatikBaslatRef.current}
                  kilitli={kilitli}
                  onYerelOlay={yerelOlay}
                  onKilitliDeneme={kilitliDeneme}
                  onBitti={videoBitti}
                />
              ) : (
                <HariciIzleyici
                  url={oda.video_url}
                  servis={yayinServisi(oda.video_url)}
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
            {bildirim && (
              <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg bg-koltuk/90 px-3 py-1.5 text-xs font-medium text-isik shadow-lg backdrop-blur-sm">
                {bildirim}
              </div>
            )}
            {sahneIciKatman}
          </div>
          {popoverVar && (
            /* Yabancı tam ekran (site/YouTube oynatıcısının kendi ⛶'ü):
               popover top layer'da tam ekran iframe'in ÜSTÜNE boyanır —
               ama Chromium hit-test'i tam ekran öğesine verdiği için burada
               yalnız görsel şeyler (kayan mesajlar + ipucu) yaşar. */
            <div
              ref={fsKatmanRef}
              popover="manual"
              className="pointer-events-none fixed inset-0 m-0 h-full w-full overflow-hidden border-0 bg-transparent p-0"
            >
              {tamEkranTuru === "yabanci" && kayanlarKatmani}
              {tamEkranTuru === "yabanci" && fsIpucu && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-perde/80 px-4 py-2 text-sm text-isik shadow-lg backdrop-blur-sm">
                  💬 Sohbet mesajları burada akar — yazmak için{" "}
                  <b className="text-amber">Esc</b>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-cizgi bg-koltuk p-3">
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
              className="min-w-0 flex-1 basis-full rounded-lg border border-cizgi bg-perde px-3 py-2 text-sm outline-none placeholder:text-soluk/60 focus:border-amber/60 disabled:opacity-60 sm:basis-0"
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
            <Katilimcilar
              kimlikler={katilimcilar}
              benimKimlik={kimlik}
              sahibim={sahibim}
              susturulanlar={oda?.muted ?? []}
              onSustur={susturDegistir}
            />
            <Sohbet
              mesajlar={mesajlar}
              benimAdim={ad}
              yazanlar={yazanlar}
              susturuldum={susturuldum}
              onYaziyor={yaziyorBildir}
              onGonder={mesajGonder}
              onSil={mesajSil}
              onDuzenle={mesajDuzenle}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
