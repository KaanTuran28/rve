# PROJE_HAFIZA.md — Rve

> Bu dosya, yeni bir Claude oturumunun (token/oturum bittiğinde) kaldığı yerden devam edebilmesi için tutulur. Önemli bir değişiklik yapınca bu dosyayı güncelle.

## Proje nedir?
rave.io benzeri, web'de çalışan, ticari olmayan "birlikte izleme" uygulaması. Arkadaş ortamı için: oda kur → kodu paylaş → senkronize YouTube izle + sohbet et. Film siteleri (ör. hdfilmcehennemi) için iframe + "3-2-1 senkron sayacı" yaklaşımı var. Kullanıcı: kaanturan627@gmail.com, Türkçe arayüz istendi.

## Durum (2026-07-05, 3. tur)
- ✅ **Supabase kuruldu (MCP ile).** Proje ref: `jjdgfhqsbsfygyfopfxd`, URL: `https://jjdgfhqsbsfygyfopfxd.supabase.co`. `schema.sql` `rve_initial_schema` migration'ı olarak uygulandı (rooms + messages + RLS politikaları). `.env.local` dolduruldu (NEXT_PUBLIC_SUPABASE_URL + klasik anon JWT). DB yazma/okuma + FK cascade + ana sayfa render'ı doğrulandı (test odası oluşturulup silindi). Güvenlik advisor'ı sadece beklenen "RLS always true" uyarılarını veriyor (auth'suz arkadaş uygulaması için bilinçli).
- ⬜ Kalan: GitHub'a push + Vercel deploy (env değişkenlerini Vercel panosuna da girmek gerekir). Gerçek çok-kullanıcılı senkron testi iki tarayıcı sekmesiyle localhost:3000'de artık yapılabilir.
- ✅ Kod tamamen yazıldı, `npm run build` temiz.
- ✅ Görsel testler yapıldı: headless Edge/playwright-core ile masaüstü (1366px) ve mobil (390px) ekran görüntüleri alındı, **yatay taşma 0px** doğrulandı. Ana sayfa + oda düzeni + mobil onaylandı.
- ✅ 2. turda eklenenler: uçan emoji tepkileri (`components/Tepkiler.tsx`, broadcast `tur:'tepki'`), "⟳ Senkronla" düğmesi (DB'den konum okuyup hizalar), sohbette "katıldı/ayrıldı" sistem bildirimleri (presence join/leave, ilk 3 sn bastırılır), performans için `React.memo` (oynatıcı/iframe/katılımcılar sohbet güncellemelerinde re-render olmaz), film taneciği dokusu + logo ışıması + favicon (`app/icon.svg`), 8 sn'de gecikme uyarısı.
- ⬜ Kullanıcının yapacakları: Supabase projesi + `supabase/schema.sql`, `.env.local`, GitHub + Vercel deploy (adımlar README.md'de). Kullanıcı manuel testleri kendisi yapacak.
- Gerçek çok-kullanıcılı senkron testi ancak Supabase anahtarları girildikten sonra iki tarayıcı sekmesiyle yapılabilir.

## Mimari
- **Next.js 15 App Router + TS + Tailwind v4** (`@tailwindcss/postcss`, tema token'ları `app/globals.css` içindeki `@theme` bloğunda — renk adları Türkçe: perde/koltuk/kadife/cizgi/isik/soluk/amber/canli).
- **Supabase**: `lib/supabase.ts` — env yoksa client `null` döner ve `components/KurulumEksik.tsx` gösterilir (uygulama çökmez).
- **DB** (`supabase/schema.sql`): `rooms` (code unique, video_url, video_type 'youtube'|'external', is_playing, playback_time, updated_at) ve `messages`. RLS açık ama anon'a tam izin (auth yok).
- **Realtime**: oda başına 1 kanal `oda:{KOD}`, `broadcast.self=false`.
  - Event `senkron`: `{tur:'oynat'|'duraklat', saniye}` | `{tur:'video', url, videoTipi}` | `{tur:'geriSayim', baslatan}` (tipler `lib/types.ts` → `SenkronOlay`).
  - Event `mesaj`: DB'ye insert edilen satır payload olarak yayınlanır.
  - Presence key = takma ad; katılımcı listesi `presenceState()` anahtarlarından.
- **Geç katılan senkronu**: oda satırındaki `playback_time + (now - updated_at)` (oynuyorsa) → `baslangicSaniyeRef` → YouTube player `start` parametresi. Oynat/duraklat yapan herkes rooms satırını da günceller.
- **Yankı önleme**: `YouTubeOynatici` içinde `uzaktanKadarRef` — uzaktan komut uygulandıktan sonra ~1.5-2 sn `onStateChange` yayınlanmaz. Seek, PLAYING/PAUSED olaylarının `saniye` alanıyla dolaylı senkronlanır (1.5 sn tolerans).
- **Harici site modu**: iframe dene; çoğu site X-Frame-Options ile engeller → arayüzde "Yeni sekmede aç" + `geriSayim` broadcast'i ile 3-2-1 overlay (`components/GeriSayim.tsx`).

## Dosya haritası
```
app/page.tsx            ana sayfa (takma ad + oda kur/katıl)
app/oda/[kod]/page.tsx  oda ekranı: kanal kurulumu, tüm state, header, düzen
app/layout.tsx          fontlar (Bricolage Grotesque display + Figtree body, latin-ext)
app/globals.css         Tailwind v4 @theme + huzme/bilet/nabiz/rakam efektleri
components/             YouTubeOynatici (IFrame API, imperative ref), HariciIzleyici,
                        Sohbet, Katilimcilar, GeriSayim, KurulumEksik
lib/supabase.ts         client + kodUret + youtubeIdAyikla + takma ad localStorage
lib/types.ts            Oda, Mesaj, SenkronOlay, OynaticiKontrol
supabase/schema.sql     tablolar + RLS politikaları
```

## Bilinen sınırlar / olası sonraki adımlar
- Seek algılama YouTube state olayları üzerinden dolaylı; hassas frame senkronu yok (arkadaş ortamı için yeterli).
- Oda listesi/temizliği yok — eski odalar DB'de kalır (istenirse Supabase'de cron ile `created_at < now()-interval '7 days'` silinebilir).
- Olası eklemeler: emoji tepkileri, "herkesi senkronla" düğmesi, oda sahibi kilidi, video kuyruğu, sesli sohbet (LiveKit ücretsiz katman).
- Takma ad çakışması: aynı ada sahip iki kişi presence'ta tek görünür (key=ad). Gerekirse key'e rastgele ek eklenebilir.

## Komutlar
```bash
npm run dev    # geliştirme
npm run build  # üretim derlemesi (doğrulama için kullanıldı)
```
