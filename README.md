# Rve 🎬

Arkadaş ortamı için ücretsiz, ticari olmayan "birlikte izleme" (watch party) web uygulaması. rave.io'nun web tarayıcısında çalışan sade bir benzeri.

**Özellikler:** oda kurma (6 haneli kod), odaya katılma, gerçek zamanlı sohbet, katılımcı listesi, YouTube videolarını otomatik senkronize izleme, film siteleri için iframe + "3-2-1 senkron sayacı", sinema modu ve tam ekran.

**Teknoloji:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Supabase (Postgres + Realtime). Hesap/üyelik yok, sadece takma ad.

## Kurulum (bir kere yapılır, ~10 dakika)

### 1. Supabase (ücretsiz)
1. [supabase.com](https://supabase.com) → ücretsiz hesap → **New project** (bölge: Frankfurt önerilir).
2. Sol menüden **SQL Editor** → bu repodaki `supabase/schema.sql` içeriğini yapıştır → **Run**.
3. **Project Settings → API** sayfasından iki değeri kopyala: `Project URL` ve `anon public` anahtarı.

### 2. Yerelde çalıştırma
```bash
# proje kökünde
copy .env.example .env.local     # (Windows) sonra iki değeri doldur
npm install
npm run dev                      # http://localhost:3000
```

`.env.local` içeriği:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Vercel'e yayınlama (ücretsiz)
1. Projeyi GitHub'a push et (repo private olabilir).
2. [vercel.com](https://vercel.com) → **Add New → Project** → repoyu içe aktar.
3. **Environment Variables** bölümüne `.env.local`'daki iki değişkeni ekle.
4. **Deploy** → çıkan adresi arkadaşlarına gönder.

## Kullanım
1. Ana sayfada takma ad yaz → **Oda Kur** (ya da koddan **Katıl**).
2. Üstteki oda kodu düğmesine tıkla → davet linki kopyalanır, arkadaşlarına at.
3. Alttaki kutuya **YouTube linki** yapıştır → herkeste aynı anda açılır; oynat/duraklat/sarma herkese yansır.
4. **Film sitesi** adresi yapıştırırsan iframe içinde açılmaya çalışılır. Çoğu site gömülmeyi engeller — o zaman herkes "Yeni sekmede aç" desin, biri **3-2-1 Senkron** sayacını başlatsın, sayaç bitince herkes oynat'a bassın.
5. **Sinema modu** sohbeti gizler; **⛶ Tam ekran** video alanını tam ekran yapar.

## Notlar
- Devam eden geliştirme durumu ve mimari notlar: `PROJE_HAFIZA.md`.
- Kimlik doğrulama yoktur; oda kodunu bilen herkes girebilir. Sadece arkadaş ortamında kullanın.
- Supabase ücretsiz katmanı bu kullanım için fazlasıyla yeterlidir (500 MB DB, 200 eşzamanlı Realtime bağlantısı).
