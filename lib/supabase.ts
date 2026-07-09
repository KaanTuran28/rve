import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sekme kapanırken keepalive fetch ile oda silmek için ham değerler. */
export const supabaseUrl = url ?? null;
export const supabaseAnonKey = anonKey ?? null;

/** Ortam değişkenleri yoksa null döner; arayüz "kurulum eksik" ekranı gösterir. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

const KOD_HARFLERI = "ABCDEFGHJKLMNPQRSTUVYZ23456789";

export function kodUret(uzunluk = 6): string {
  let kod = "";
  for (let i = 0; i < uzunluk; i++) {
    kod += KOD_HARFLERI[Math.floor(Math.random() * KOD_HARFLERI.length)];
  }
  return kod;
}

/**
 * DRM'li / gömülmeye izin vermeyen bilinen yayın servisleri. Bunlar iframe'de
 * boş kalır; arayüz iframe yerine "kendi hesabınla aç + ortak senkron" panelini gösterir.
 */
const YAYIN_SERVISLERI: { anahtar: string; ad: string }[] = [
  { anahtar: "netflix.", ad: "Netflix" },
  { anahtar: "disneyplus.", ad: "Disney+" },
  { anahtar: "hbomax.", ad: "HBO Max" },
  { anahtar: "max.com", ad: "Max" },
  { anahtar: "primevideo.", ad: "Prime Video" },
  { anahtar: "amazon.", ad: "Prime Video" },
  { anahtar: "hulu.", ad: "Hulu" },
  { anahtar: "blutv.", ad: "BluTV" },
  { anahtar: "exxen.", ad: "Exxen" },
  { anahtar: "gain.tv", ad: "Gain" },
  { anahtar: "tabii.", ad: "tabii" },
  { anahtar: "mubi.", ad: "MUBI" },
  { anahtar: "appletv", ad: "Apple TV+" },
];

/** URL bilinen bir yayın servisiyse adını döndürür, değilse null. */
export function yayinServisi(url: string): string | null {
  const u = url.toLowerCase();
  for (const s of YAYIN_SERVISLERI) if (u.includes(s.anahtar)) return s.ad;
  return null;
}

export function youtubeIdAyikla(girdi: string): string | null {
  const metin = girdi.trim();
  const eslesme = metin.match(
    /(?:youtube\.com\/(?:watch\?.*?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  if (eslesme) return eslesme[1];
  if (/^[\w-]{11}$/.test(metin)) return metin;
  return null;
}

const NICK_ANAHTARI = "rve_takma_ad";

export function takmaAdOku(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NICK_ANAHTARI) ?? "";
}

export function takmaAdKaydet(ad: string) {
  // '#' presence kimliğinde ad/rastgele-ek ayracı olarak kullanılıyor
  localStorage.setItem(NICK_ANAHTARI, ad.replace(/#/g, "").trim());
}

/** Presence kimliğinden (ad#rastgele) görünen adı çıkarır. */
export function kimliktenAd(kimlik: string): string {
  return kimlik.split("#")[0];
}

const SAHIP_ONEKI = "rve_sahip_";

/** Oda kurulurken üretilen sahip anahtarını bu tarayıcıda saklar. */
export function sahipAnahtariKaydet(kod: string, anahtar: string) {
  try {
    localStorage.setItem(SAHIP_ONEKI + kod.toUpperCase(), anahtar);
  } catch {}
}

export function sahipAnahtariOku(kod: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SAHIP_ONEKI + kod.toUpperCase());
}

/** YouTube oEmbed'den video başlığını dener; olmazsa null (kuyruk etiketi için). */
export async function videoBasligi(url: string): Promise<string | null> {
  try {
    const yanit = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (!yanit.ok) return null;
    const veri = await yanit.json();
    return typeof veri.title === "string" ? veri.title : null;
  } catch {
    return null;
  }
}
