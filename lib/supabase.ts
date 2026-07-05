import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  localStorage.setItem(NICK_ANAHTARI, ad.trim());
}
