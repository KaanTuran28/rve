import { memo } from "react";

interface Props {
  adlar: string[];
  benimAdim: string;
}

function Katilimcilar({ adlar, benimAdim }: Props) {
  return (
    <div className="border-b border-cizgi p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soluk">
        <span className="nabiz inline-block h-2 w-2 rounded-full bg-canli" />
        Salonda {adlar.length} kişi
      </p>
      <div className="flex flex-wrap gap-1.5">
        {adlar.map((ad) => (
          <span
            key={ad}
            className={`rounded-full px-2.5 py-1 text-xs ${
              ad === benimAdim
                ? "bg-amber/15 text-amber"
                : "bg-kadife text-isik"
            }`}
          >
            {ad}
            {ad === benimAdim && " (sen)"}
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(Katilimcilar);
