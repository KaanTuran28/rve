# Rve — Video Senkron Eklentisi (MVP)

Rve odandaki arkadaşlarınla **herhangi bir video sitesini senkron izlemek** için
Chrome/Edge eklentisi. Netflix, Google'da bulduğun film siteleri, ya da HTML5 video
oynatan çoğu site çalışır. Biri **oynat / duraklat / ileri-geri sar** yaptığında herkeste
aynı anda uygulanır. Sohbet ve oda yönetimi **Rve sitesinde** kalır — bu eklenti sadece
sayfadaki oynatıcıyı odanın Supabase kanalına bağlar.

## Nasıl çalışır (kısaca)
- **background.js** (service worker): Rve ile aynı Supabase Realtime kanalına
  (`realtime:oda:{KOD}`) ham WebSocket ile bağlanır. Sitelerin CSP'sinden etkilenmemek için
  WebSocket burada tutulur; 25 sn'de bir heartbeat ile canlı kalır.
- **content.js**: Her sayfada ve her frame'de çalışır; sayfadaki **en büyük `<video>`**
  öğesini (ana içerik) yakalar. Yerel oynat/duraklat/sar olaylarını yayınlar, uzaktan
  gelenleri videoya uygular (yankı önleme + 30 sn altı reklam videolarını filtreleme var).
- **popup**: oda kodunu girip bağlan/ayrıl.

## Neden her sitede çalışıyor
- Çoğu film sitesinde video, **başka origin'den bir iframe** içindedir. Eklenti
  `all_frames` ile her frame'in içine ayrı girer ve videoyu orada yakalar (origin engeli yok).
- Bunun için manifest geniş izin ister: `host_permissions: <all_urls>` ve `matches: *://*/*`.
  Yani eklenti tüm sitelerde çalışabilir — arkadaş aracı için uygun ama istersen ileride
  belirli sitelerle sınırlandırılabilir.

## Kurulum (paketlenmemiş / geliştirici modu)
1. Chrome veya Edge aç.
2. `chrome://extensions` (Edge'de `edge://extensions`) → **Geliştirici modu**'nu aç.
3. **Paketlenmemiş öğe yükle** (Load unpacked) → bu `extension/` klasörünü seç.
4. Araç çubuğunda **Rve Senkron** simgesi çıkar (puzzle simgesinden sabitleyebilirsin).
5. Arkadaşların da aynı klasörü (zip'leyip gönder) kendi tarayıcılarına bu adımlarla yükler.

> Not: Bu "paketlenmemiş yükle" yolu hem Chrome'da hem Edge'de çalışır. (Yalnızca
> Chrome'u **komut satırından** `--load-extension` ile açmak politika gereği engellidir;
> normal arayüzden yükleme etkilenmez.)

## Kullanım
1. Rve sitesinde (`rve-ebon.vercel.app`) oda kur, kodu paylaş.
2. Herkes **aynı sitede aynı içeriği** ayrı sekmede açsın (aynı film sayfası / aynı Netflix
   başlığı).
3. Eklenti simgesi → **oda kodunu** gir → **Bağlan**. Durum "Bağlı: oda XXXX" olur.
4. Artık biri oynat/duraklat/sar yaptığında herkeste uygulanır.
5. Bitince **Ayrıl**.

## Test adımları (tek bilgisayarda, iki tarayıcı profili)
1. Chrome + ikinci profil (veya Chrome + Edge) aç; ikisine de eklentiyi yükle.
2. İkisinde de **aynı** film sayfasını / video sitesini aç, oynatmaya başla.
3. Rve sitesinde oda kur, kodu al; her iki tarayıcıda eklentiye aynı kodu girip **Bağlan**.
4. Birinde **duraklat** → ötekinde de duraklamalı.
5. Birinde zaman çubuğunda **ileri sar** → öteki o saniyeye gitmeli.
6. **Oynat** → ötekinde de oynamalı.

### Hata ayıklama
- WebSocket logları: `chrome://extensions` → Rve Senkron → **service worker → Inspect** → Console.
- Video komutu uygulanmıyorsa: o sitede DevTools (F12) → Console'da hata var mı bak.
- Yanlış videoyu (reklam) yakalıyorsa: reklam bitip ana içerik oynayınca düzelir; eklenti en
  büyük videoyu seçer ve 30 sn altı videoları yok sayar.
- Bazı siteler `video.play()`'i kullanıcı etkileşimi olmadan reddedebilir → o kişi bir kez
  elle oynat'a bassın, sonrası senkron akar.

## Sınırlar (MVP)
- Sadece masaüstü Chrome/Edge + eklenti kurulumu. Mobil/TV desteklenmez.
- Herkes **aynı siteyi/içeriği** açmalı; eklenti içerik seçmez, sadece oynatmayı senkronlar.
- Ücretli servislerde (Netflix vb.) herkeste kendi aboneliği gerekir.
- Site oynatıcısı standart `<video>` kullanmıyorsa (çok nadir) çalışmayabilir.
- Reklamı/çoklu videosu yoğun sitelerde ara sıra yanlış videoyu yakalayıp düzelebilir.
