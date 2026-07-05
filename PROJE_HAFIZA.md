# PROJE_HAFIZA.md — Rve

> Bu dosya, yeni bir Claude oturumunun (token/oturum bittiğinde) kaldığı yerden devam edebilmesi için tutulur. Önemli bir değişiklik yapınca bu dosyayı güncelle.

## Proje nedir?
rave.io benzeri, web'de çalışan, ticari olmayan "birlikte izleme" uygulaması. Arkadaş ortamı için: oda kur → kodu paylaş → senkronize YouTube izle + sohbet et. Film siteleri (ör. hdfilmcehennemi) için iframe + "3-2-1 senkron sayacı" yaklaşımı var. Kullanıcı: kaanturan627@gmail.com, Türkçe arayüz istendi.

## Durum (2026-07-05, 3. tur)
- ✅ **Supabase kuruldu (MCP ile).** Proje ref: `jjdgfhqsbsfygyfopfxd`, URL: `https://jjdgfhqsbsfygyfopfxd.supabase.co`. `schema.sql` `rve_initial_schema` migration'ı olarak uygulandı (rooms + messages + RLS politikaları). `.env.local` dolduruldu (NEXT_PUBLIC_SUPABASE_URL + klasik anon JWT). DB yazma/okuma + FK cascade + ana sayfa render'ı doğrulandı (test odası oluşturulup silindi). Güvenlik advisor'ı sadece beklenen "RLS always true" uyarılarını veriyor (auth'suz arkadaş uygulaması için bilinçli).
- ✅ **8. tur: ekran sadeleştirildi + emojiler kaldırıldı.** Emoji tepkileri (uçan emoji + şerit) tamamen kaldırıldı: `components/Tepkiler.tsx` silindi, `page.tsx`'ten tepki state/callback/render + `SenkronOlay` 'tepki' tipi + `globals.css` `.ucan-tepki`/`@keyframes ucus` temizlendi. `HariciIzleyici` yeniden düzenlendi: büyük ortadaki saat/buton bloğu ve alt şerit kaldırıldı → her şey **ince tek satırlık üst toolbar**'da (rozet · url · nokta+sayaç · ▶ 3-2-1 · ⏸ Durdur · Sekmede aç ↗); mobilde flex-wrap ile url alta kayar. Not: toolbar sayacında `.rakam` sınıfı kullanılmamalı (o keyframe `opacity:0` ile bitip sayıyı gizliyor). PC+mobil ekran görüntüleriyle doğrulandı. Kullanıcıya hatırlatma: harici modda site içi durdurma OTOMATİK yayılmaz (Durdur düğmesi gerekir); otomatik senkron sadece eklentiyle.
- 🧪 **Netflix senkron eklentisi yazıldı (6. tur) — YEREL, HENÜZ PUSH EDİLMEDİ (kullanıcı isteği).** `extension/` klasörü: Manifest V3 Chrome/Edge eklentisi. `background.js` service worker Supabase Realtime'a **ham Phoenix WebSocket** protokolüyle bağlanır (harici lib yok, build yok, Netflix CSP'sinden kaçınmak için WS worker'da), 25sn heartbeat. `content.js` netflix.com/watch/* `<video>` öğesini dinler/kontrol eder (oynat/duraklat/sar, yankı-önleme bayrağı). `popup` oda kodu girip bağlan/ayrıl. **Aynı `oda:{KOD}` kanalını ve anon anahtarı kullanır — site ile tam uyumlu.** Çekirdek protokol iki-istemcili Node testiyle gerçek Supabase'e karşı doğrulandı (broadcast alışverişi çalışıyor). Kurulum + test adımları `extension/README.md`'de. **v0.2.0'da tüm sitelere genelleştirildi:** manifest `matches:*://*/*` + `host_permissions:<all_urls>` + `all_frames:true` (cross-origin iframe'lere de girer); `content.js` en büyük `<video>`'yu ana içerik seçer, 30sn altı reklamları filtreler. Yani Netflix + Google'daki film siteleri + HTML5 video oynatan çoğu site çalışır. **7. tur: E2E test edildi + PUSH EDİLDİ.** playwright-core ile iki Edge örneği (eklenti yüklü), yerel <video> test sayfası (Sintel 52sn) ve canlı Supabase kanalı üzerinden oynat/duraklat/sar senkronu üç doğrulamayla GEÇTİ; iki tarayıcının aynı kareyi gösterdiği ekran görüntüleri alındı. **Önemli:** markalı Google Chrome komut satırından (`--load-extension`) eklenti yüklemeyi reddediyor (politika), o yüzden otomasyon Edge ile yapıldı — ama kullanıcının normal `chrome://extensions → paketlenmemiş yükle` yolu Chrome'da da sorunsuz çalışır (kısıt sadece CLI'a özel). content.js'e `window.postMessage` köprüsü eklendi (site → eklenti; gelecekteki "Eklentiye bağla" butonunun temeli) + sayfa açılışında SW'yi uyandıran `rvePing`. Teşhis logları/marker temizlendi. TODO (istenirse): site tarafında "Eklentiye bağla" butonu, izinleri belirli sitelere daraltma.
- ✅ **Netflix/harici ortak-izleme geliştirildi (5. tur).** Eklenti yok — mevcut "harici site" akışı güçlendirildi. `lib/supabase.ts` `yayinServisi(url)`: Netflix/Disney+/BluTV/Exxen vb. bilinen DRM'li servisleri tanır. `HariciIzleyici` yeniden yazıldı: servis tanınırsa iframe denenmez, "kendi hesabınla aç" kartı + **ortak senkron kronometresi** gösterilir; bilinmeyen harici sitede iframe + kontrol şeridi. Ortak saat oda satırındaki `is_playing/playback_time/updated_at`'ten türetilir (YouTube'daki geç-gelen senkron mantığının aynısı). Kontroller: "Başlat/Devam (3-2-1)" → `geriSayim` broadcast; sayaç bitince `geriSayimBitti` saati başlatır, **başlatan** kişi DB'ye yazar. "Durdur" → yeni `hariciDurdur{saniye}` broadcast + DB yazımı, herkeste saat donar. Sürekli otomatik senkron değil (Netflix player'ına erişemeyiz) ama koordineli kronometre + durdur/başlat ile pratik. Build+typecheck temiz; iki-sekme canlı testi kullanıcıya.
- ✅ **Çıkış + boş oda otomatik silme eklendi (4. tur).** Header'da "Çıkış" düğmesi (`cikisYap`): son üyeysen (`sonUyeyMiyim` = presenceState anahtar sayısı ≤ 1) odayı `supabase.from('rooms').delete()` ile siler, sonra untrack + ana sayfaya döner. Sekme kapanınca `pagehide` (bfcache/`e.persisted` hariç) + `fetch keepalive` ile REST DELETE beacon. Yeni RLS: `rooms_delete using(true)` (migration `rve_rooms_delete_policy`, schema.sql güncel). Mesajlar FK cascade ile gider (cascade RLS'i bypass eder). Anon DELETE REST'te 204 + cascade doğrulandı. Not: son kişinin tarayıcısı çökerse/ağ giderse `pagehide` tetiklenmez → nadir yetim oda kalabilir (istenirse pg_cron ile eski oda temizliği eklenebilir).
- ✅ **YAYINDA.** GitHub: `https://github.com/KaanTuran28/rve` (main). Vercel: `https://rve-ebon.vercel.app` — env değişkenleri girildi, canlı site normal arayüzü gösteriyor (kurulum eksik ekranı yok, Supabase bağlı). Proje tamamlandı. Gerçek çok-kullanıcılı senkron testi iki tarayıcı sekmesiyle yapılabilir.
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
