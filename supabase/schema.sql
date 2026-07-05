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

-- Kimlik doğrulama yok (arkadaş ortamı): anon anahtarla okuma/yazma serbest.
alter table rooms enable row level security;
alter table messages enable row level security;

create policy "rooms_select" on rooms for select using (true);
create policy "rooms_insert" on rooms for insert with check (true);
create policy "rooms_update" on rooms for update using (true);
create policy "messages_select" on messages for select using (true);
create policy "messages_insert" on messages for insert with check (true);
