export type VideoTipi = "youtube" | "external";

/** Video kuyruğundaki bir öğe (rooms.queue jsonb dizisinin elemanı). */
export interface KuyrukOgesi {
  url: string;
  videoTipi: VideoTipi;
  etiket: string;
}

export interface Oda {
  id: string;
  code: string;
  name: string;
  video_url: string | null;
  video_type: VideoTipi;
  is_playing: boolean;
  playback_time: number;
  queue: KuyrukOgesi[];
  /** Oda kuranın localStorage'ındaki gizli anahtar; eski odalarda null. */
  owner_token: string | null;
  /** Kilitliyken kontroller sadece oda sahibinde. */
  locked: boolean;
  updated_at: string;
  created_at: string;
}

export interface Mesaj {
  id: string;
  room_id: string;
  nickname: string;
  content: string;
  created_at: string;
  /** Sadece yerelde üretilen "katıldı/ayrıldı" bildirimleri için. */
  sistem?: boolean;
}

export type SenkronOlay =
  | { tur: "oynat"; saniye: number }
  | { tur: "duraklat"; saniye: number }
  | { tur: "video"; url: string; videoTipi: VideoTipi }
  | { tur: "geriSayim"; baslatan: string }
  | { tur: "hariciDurdur"; saniye: number }
  | { tur: "kuyruk"; kuyruk: KuyrukOgesi[] }
  | { tur: "kilit"; kilitli: boolean };

export interface OynaticiKontrol {
  oynat(saniye?: number): void;
  duraklat(saniye?: number): void;
}
