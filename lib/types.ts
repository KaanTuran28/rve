export type VideoTipi = "youtube" | "external";

export interface Oda {
  id: string;
  code: string;
  name: string;
  video_url: string | null;
  video_type: VideoTipi;
  is_playing: boolean;
  playback_time: number;
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
  | { tur: "tepki"; emoji: string };

export interface OynaticiKontrol {
  oynat(saniye?: number): void;
  duraklat(saniye?: number): void;
}
