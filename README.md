# Rve 🎬

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ecf8e)
![License](https://img.shields.io/badge/license-MIT-green)

<p align="center"><b><a href="#english">English</a></b> · <b><a href="#türkçe">Türkçe</a></b></p>

**Live demo:** https://rve-t-x.vercel.app

---

## English

A free, non-commercial "watch party" web app for watching things together with friends — a simple, browser-based take on rave.io. No accounts, just a nickname.

### Features

- Create a room (6-digit code) and join by code.
- Real-time chat and a participant list.
- Synchronised YouTube playback — play, pause and seek apply to everyone at once.
- For movie sites: an iframe plus a "3-2-1 sync countdown" for when a site blocks embedding.
- Cinema mode (hides chat) and fullscreen.

### Tech stack

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Supabase (Postgres + Realtime).

### Setup (~10 minutes, once)

**1. Supabase (free)**
1. Create a free account at [supabase.com](https://supabase.com) → **New project** (Frankfurt region recommended).
2. In **SQL Editor**, paste the contents of `supabase/schema.sql` from this repo and **Run**.
3. From **Project Settings → API**, copy the `Project URL` and the `anon public` key.

**2. Run locally**
```bash
cp .env.example .env.local     # Windows: copy .env.example .env.local
npm install
npm run dev                    # http://localhost:3000
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**3. Deploy to Vercel (free)**
1. Push the project to GitHub (the repo can be private).
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Add the two environment variables under **Environment Variables**.
4. **Deploy**, then share the URL with your friends.

### Usage

1. Enter a nickname on the home page → **Create room** (or **Join** with a code).
2. Click the room-code button at the top to copy an invite link.
3. Paste a **YouTube link** in the box at the bottom — it opens for everyone at once and playback stays in sync.
4. Paste a **movie-site URL** and it tries to open it in an iframe. Most sites block embedding; then everyone opens it in a new tab, one person starts the **3-2-1 sync** countdown, and everyone hits play when it ends.
5. **Cinema mode** hides the chat; **⛶ Fullscreen** expands the video area.

### Notes

- There is no authentication — anyone with the room code can join. Use it among friends only.
- Supabase's free tier is more than enough for this (500 MB DB, 200 concurrent Realtime connections).
- Development notes and architecture: `PROJE_HAFIZA.md`.

### License

MIT — see [LICENSE](./LICENSE).

---

## Türkçe

Arkadaş ortamı için ücretsiz, ticari olmayan bir "birlikte izleme" (watch party) web uygulaması — rave.io'nun web tarayıcısında çalışan sade bir benzeri. Hesap/üyelik yok, sadece takma ad.

### Özellikler

- Oda kurma (6 haneli kod) ve koddan katılma.
- Gerçek zamanlı sohbet ve katılımcı listesi.
- YouTube videolarını senkron izleme — oynat/duraklat/sarma herkese aynı anda yansır.
- Film siteleri için iframe + gömülmeyi engelleyen siteler için "3-2-1 senkron sayacı".
- Sinema modu (sohbeti gizler) ve tam ekran.

### Teknoloji

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Supabase (Postgres + Realtime).

### Kurulum (~10 dakika, bir kere)

**1. Supabase (ücretsiz)**
1. [supabase.com](https://supabase.com) → ücretsiz hesap → **New project** (bölge: Frankfurt önerilir).
2. **SQL Editor** → bu repodaki `supabase/schema.sql` içeriğini yapıştır → **Run**.
3. **Project Settings → API** sayfasından `Project URL` ve `anon public` anahtarını kopyala.

**2. Yerelde çalıştırma**
```bash
copy .env.example .env.local     # (Windows) sonra iki değeri doldur
npm install
npm run dev                      # http://localhost:3000
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**3. Vercel'e yayınlama (ücretsiz)**
1. Projeyi GitHub'a push et (repo private olabilir).
2. [vercel.com](https://vercel.com) → **Add New → Project** → repoyu içe aktar.
3. `.env.local`'daki iki değişkeni **Environment Variables** bölümüne ekle.
4. **Deploy** → çıkan adresi arkadaşlarına gönder.

### Kullanım

1. Ana sayfada takma ad yaz → **Oda Kur** (ya da koddan **Katıl**).
2. Üstteki oda kodu düğmesine tıkla → davet linki kopyalanır.
3. Alttaki kutuya **YouTube linki** yapıştır → herkeste aynı anda açılır, oynatma senkron kalır.
4. **Film sitesi** adresi yapıştırırsan iframe içinde açılmaya çalışılır. Çoğu site gömülmeyi engeller — o zaman herkes "Yeni sekmede aç" der, biri **3-2-1 Senkron** sayacını başlatır, sayaç bitince herkes oynat'a basar.
5. **Sinema modu** sohbeti gizler; **⛶ Tam ekran** video alanını büyütür.

### Notlar

- Kimlik doğrulama yoktur; oda kodunu bilen herkes girebilir. Sadece arkadaş ortamında kullanın.
- Supabase ücretsiz katmanı bu kullanım için fazlasıyla yeterlidir (500 MB DB, 200 eşzamanlı Realtime bağlantısı).
- Geliştirme durumu ve mimari notlar: `PROJE_HAFIZA.md`.

### Lisans

MIT — bkz. [LICENSE](./LICENSE).
