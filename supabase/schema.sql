-- Rve şeması: Supabase SQL Editor'da tek seferde çalıştır.
create extension if not exists "pgcrypto";

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null default 'Film Gecesi',
  video_url text,
  video_type text not null default 'youtube' check (video_type in ('youtube', 'external')),
  is_playing boolean not null default false,
  playback_time double precision not null default 0,
  -- Video kuyruğu: [{url, videoTipi, etiket}] dizisi
  queue jsonb not null default '[]'::jsonb,
  -- Oda sahibi kilidi: token oda kuranın localStorage'ında saklanır (auth yok)
  owner_token text,
  locked boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  nickname text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_idx on messages (room_id, created_at);

-- Veri hijyeni: RLS herkese açık olduğundan doğrudan REST kötüye kullanımına
-- karşı en azından boyut/biçim sınırları (migration: rve_veri_kisitlari)
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
  );

-- Kimlik doğrulama yok (arkadaş ortamı): anon anahtarla okuma/yazma serbest.
alter table rooms enable row level security;
alter table messages enable row level security;

create policy "rooms_select" on rooms for select using (true);
create policy "rooms_insert" on rooms for insert with check (true);
create policy "rooms_update" on rooms for update using (true);
create policy "rooms_delete" on rooms for delete using (true);
create policy "messages_select" on messages for select using (true);
create policy "messages_insert" on messages for insert with check (true);

-- Yetim oda temizliği: 24 saattir güncellenmeyen odaları saatte bir sil.
-- (Son üyenin tarayıcısı çökerse pagehide tetiklenmez; bu job artıkları toplar.)
create extension if not exists pg_cron;
select cron.schedule(
  'rve_eski_oda_temizligi',
  '17 * * * *',
  $$delete from public.rooms where updated_at < now() - interval '24 hours'$$
);
