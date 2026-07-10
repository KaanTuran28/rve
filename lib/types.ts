export type VideoTipi = "youtube" | "external";

/** Rve tarayıcı eklentisi bu sekmede algılandı mı / odaya bağlı mı. */
export type EklentiDurumu = "yok" | "var" | "bagli";

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
  /** Oda sahibinin susturduğu takma adlar (sohbete yazamazlar). */
  muted: string[];
  updated_at: string;
  created_at: string;
}

export interface Mesaj {
  id: string;
  room_id: string;
  nickname: string;
  content: string;
  created_at: string;
  /** Mesaj sonradan düzenlendiyse dolu ("(düzenlendi)" işareti için). */
  edited_at?: string | null;
  /** Mesaj silindiyse dolu — yerinde "silindi" izi gösterilir. */
  deleted_at?: string | null;
  /** Sadece yerelde üretilen "katıldı/ayrıldı" bildirimleri için. */
  sistem?: boolean;
}

/** `kim`: olayı yapan kişinin takma adı — karşı tarafta "kaan duraklattı" bildirimi
 * için. Eklentiden gelen olaylarda bulunmaz (bildirim gösterilmez). */
export type SenkronOlay =
  | { tur: "oynat"; saniye: number; kim?: string }
  | { tur: "duraklat"; saniye: number; kim?: string }
  | { tur: "video"; url: string; videoTipi: VideoTipi; kim?: string }
  | { tur: "geriSayim"; baslatan: string }
  | { tur: "hariciDurdur"; saniye: number; kim?: string }
  | { tur: "kuyruk"; kuyruk: KuyrukOgesi[]; kim?: string }
  | { tur: "kilit"; kilitli: boolean }
  | { tur: "sustur"; adlar: string[] };

export interface OynaticiKontrol {
  oynat(saniye?: number): void;
  duraklat(saniye?: number): void;
}
