import { memo } from "react";
import { kimliktenAd } from "@/lib/supabase";

interface Props {
  /** Presence anahtarları: "ad#rastgele" — aynı ada sahip kişiler ayrı görünür. */
  kimlikler: string[];
  benimKimlik: string;
}

function Katilimcilar({ kimlikler, benimKimlik }: Props) {
  return (
    <div className="border-b border-cizgi p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soluk">
        <span className="nabiz inline-block h-2 w-2 rounded-full bg-canli" />
        Salonda {kimlikler.length} kişi
      </p>
      <div className="flex flex-wrap gap-1.5">
        {kimlikler.map((kimlik) => (
          <span
            key={kimlik}
            className={`rounded-full px-2.5 py-1 text-xs ${
              kimlik === benimKimlik
                ? "bg-amber/15 text-amber"
                : "bg-kadife text-isik"
            }`}
          >
            {kimliktenAd(kimlik)}
            {kimlik === benimKimlik && " (sen)"}
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(Katilimcilar);
