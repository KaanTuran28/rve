import { memo } from "react";
import { kimliktenAd } from "@/lib/supabase";

interface Props {
  /** Presence anahtarları: "ad#rastgele" — aynı ada sahip kişiler ayrı görünür. */
  kimlikler: string[];
  benimKimlik: string;
  /** Oda sahibiysem katılımcıların yanında sustur düğmesi görünür. */
  sahibim: boolean;
  /** Susturulmuş takma adlar (rooms.muted). */
  susturulanlar: string[];
  onSustur: (ad: string) => void;
}

function Katilimcilar({
  kimlikler,
  benimKimlik,
  sahibim,
  susturulanlar,
  onSustur,
}: Props) {
  return (
    <div className="border-b border-cizgi p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soluk">
        <span className="nabiz inline-block h-2 w-2 rounded-full bg-canli" />
        Salonda {kimlikler.length} kişi
      </p>
      <div className="flex flex-wrap gap-1.5">
        {kimlikler.map((kimlik) => {
          const kisiAdi = kimliktenAd(kimlik);
          const susturulmus = susturulanlar.includes(kisiAdi);
          return (
            <span
              key={kimlik}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                kimlik === benimKimlik
                  ? "bg-amber/15 text-amber"
                  : "bg-kadife text-isik"
              }`}
            >
              {kisiAdi}
              {kimlik === benimKimlik && " (sen)"}
              {susturulmus && (
                <span title="Susturuldu — mesaj yazamaz">🔇</span>
              )}
              {sahibim && kimlik !== benimKimlik && (
                <button
                  onClick={() => onSustur(kisiAdi)}
                  title={
                    susturulmus
                      ? "Susturmayı kaldır"
                      : "Sustur: sohbete mesaj yazamasın"
                  }
                  className={`ml-0.5 shrink-0 transition hover:scale-110 ${
                    susturulmus ? "text-amber" : "text-soluk hover:text-amber"
                  }`}
                >
                  {susturulmus ? "🔊" : "🔇"}
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default memo(Katilimcilar);
