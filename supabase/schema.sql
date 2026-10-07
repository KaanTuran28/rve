-- Rve şeması: Supabase SQL Editor'da tek seferde çalıştır.
create extension if not exists "pgcrypto";

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null default 'Film Gecesi',
  video_url text,
  video_type text not null default 'youtube' check (video_type in ('youtube', 'external', 'yuklenen', 'ekran')),
  is_playing boolean not null default false,
  playback_time double precision not null default 0,
  -- Video kuyruğu: [{url, videoTipi, etiket}] dizisi
  queue jsonb not null default '[]'::jsonb,
  -- Oda sahibi kilidi: token oda kuranın localStorage'ında saklanır (auth yok)
  owner_token text,
  locked boolean not null default false,
  -- Oda sahibinin susturduğu takma adlar (sohbete yazamazlar)
  muted jsonb not null default '[]'::jsonb,
  -- video_type "ekran" iken ekranını paylaşan kişinin presence kimliği
  ekran_paylasan text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  nickname text not null,
  content text not null,
  -- Mesaj sonradan düzenlendiyse dolu
  edited_at timestamptz,
  -- Mesaj silindiyse dolu (satır kalır, yerinde "silindi" izi gösterilir)
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_idx on messages (room_id, created_at);

-- Veri hijyeni: oda kodunu bilen doğrudan REST'e yazabildiğinden kötüye
-- kullanıma karşı boyut/biçim sınırları (migration: rve_veri_kisitlari)
alter table messages
  add constraint messages_content_uzunluk check (char_length(content) between 1 and 500),
  add constraint messages_nickname_uzunluk check (char_length(nickname) between 1 and 40);
alter table rooms
  add constraint rooms_name_uzunluk check (char_length(name) between 1 and 80),
  add constraint rooms_code_uzunluk check (char_length(code) between 4 and 12),
  add constraint rooms_video_url_bicim check (
    video_url is null
    or (char_length(video_url) <= 2048 and video_url ~* '^https?://')
  ),
  add constraint rooms_queue_boyut check (
    jsonb_typeof(queue) = 'array' and jsonb_array_length(queue) <= 50
  ),
  add constraint rooms_playback_araligi check (
    playback_time >= 0 and playback_time < 360000
  ),
  add constraint rooms_muted_boyut check (
    jsonb_typeof(muted) = 'array' and jsonb_array_length(muted) <= 100
  );

-- Kimlik doğrulama yok (arkadaş ortamı): oda kodunu bilen = odanın üyesi.
-- İstemci her tablo isteğinde kodu `x-rve-oda` başlığıyla gönderir; kodu
-- bilmeyen hiçbir odayı/mesajı göremez, değiştiremez, silemez
-- (migration: rve_oda_kodu_rls).
alter table rooms enable row level security;
alter table messages enable row level security;

create or replace function public.rve_istek_kodu()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    upper(coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> 'x-rve-oda'),
    ''
  )
$$;

create policy "rooms_select" on rooms for select to anon, authenticated
  using (code = (select public.rve_istek_kodu()));
create policy "rooms_insert" on rooms for insert to anon, authenticated
  with check (code = (select public.rve_istek_kodu()));
create policy "rooms_update" on rooms for update to anon, authenticated
  using (code = (select public.rve_istek_kodu()))
  with check (code = (select public.rve_istek_kodu()));
create policy "rooms_delete" on rooms for delete to anon, authenticated
  using (code = (select public.rve_istek_kodu()));

create policy "messages_select" on messages for select to anon, authenticated
  using (exists (
    select 1 from rooms r
    where r.id = room_id and r.code = (select public.rve_istek_kodu())
  ));
create policy "messages_insert" on messages for insert to anon, authenticated
  with check (exists (
    select 1 from rooms r
    where r.id = room_id and r.code = (select public.rve_istek_kodu())
  ));
-- Düzenleme ve "silindi" işareti (sahiplik kontrolü istemcide). Sert silme
-- politikası bilinçli yok: oda silinince mesajlar FK cascade ile gider.
create policy "messages_update" on messages for update to anon, authenticated
  using (exists (
    select 1 from rooms r
    where r.id = room_id and r.code = (select public.rve_istek_kodu())
  ))
  with check (exists (
    select 1 from rooms r
    where r.id = room_id and r.code = (select public.rve_istek_kodu())
  ));

-- Kişisel video yükleme: herkese açık bucket (migration `rve_oda_medya_bucket`).
-- Auth olmadığından imzalı URL yerine public tercih edildi; oynatma public URL'den
-- olduğu için okuma politikası gerekmez. Listeleme/silme yok, yalnız video kabul edilir.
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('oda-medya', 'oda-medya', true, array['video/*'])
on conflict (id) do nothing;

create policy "oda_medya_insert" on storage.objects for insert
  with check (bucket_id = 'oda-medya');

-- Yetim oda temizliği: 24 saattir güncellenmeyen odaları saatte bir sil.
-- (Son üyenin tarayıcısı çökerse pagehide tetiklenmez; bu job artıkları toplar.)
create extension if not exists pg_cron;
select cron.schedule(
  'rve_eski_oda_temizligi',
  '17 * * * *',
  $$delete from public.rooms where updated_at < now() - interval '24 hours'$$
);
