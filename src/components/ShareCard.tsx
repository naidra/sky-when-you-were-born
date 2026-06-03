import { forwardRef } from "react";
import { StarMap } from "./StarMap";
import { MoonPhase } from "./MoonPhase";
import { format } from "date-fns";
import type { SkyInputs } from "@/lib/sky";
import type { City } from "@/lib/cities";
import { computeMoon } from "@/lib/sky";

interface ShareCardProps {
  input: SkyInputs;
  city: City | { name: string; country: string };
  localDate: Date;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ input, city, localDate }, ref) => {
    const moon = computeMoon(input);
    return (
      <div
        ref={ref}
        className="ornate-border bg-night-deep relative overflow-hidden"
        style={{
          width: 720,
          height: 900,
          padding: 40,
          background:
            "radial-gradient(ellipse at center, oklch(0.18 0.04 250) 0%, oklch(0.06 0.02 260) 100%)",
        }}
      >
        {/* Ornamental corner flourishes */}
        {["tl", "tr", "bl", "br"].map((c) => (
          <div
            key={c}
            className="absolute font-display text-gold opacity-60"
            style={{
              fontSize: 28,
              ...(c.includes("t") ? { top: 12 } : { bottom: 12 }),
              ...(c.includes("l") ? { left: 16 } : { right: 16 }),
            }}
          >
            ✦
          </div>
        ))}

        <div className="text-center">
          <p className="font-display text-gold text-xs tracking-[0.4em] opacity-80">
            DER STERNENHIMMEL
          </p>
          <h1 className="font-display text-gold-bright text-2xl mt-2 tracking-widest">
            The Sky Above {city.name}
          </h1>
          <p className="font-serif italic text-gold mt-1 text-lg opacity-80">
            when you were born
          </p>
        </div>

        <div className="flex justify-center mt-4">
          <StarMap input={input} size={560} ornate showLabels />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
          <div>
            <p className="font-display text-gold text-[10px] tracking-widest opacity-70">DATE</p>
            <p className="font-serif text-gold-bright text-base mt-1">
              {format(localDate, "MMMM d, yyyy")}
            </p>
            <p className="font-serif text-gold text-xs opacity-80">{format(localDate, "HH:mm")}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="font-display text-gold text-[10px] tracking-widest opacity-70">MOON</p>
            <div className="mt-1">
              <MoonPhase phaseAngle={moon.phaseAngle} illumination={moon.illumination} size={56} />
            </div>
            <p className="font-serif text-gold text-[11px] opacity-80">{moon.phaseName}</p>
          </div>
          <div>
            <p className="font-display text-gold text-[10px] tracking-widest opacity-70">PLACE</p>
            <p className="font-serif text-gold-bright text-base mt-1">{city.name}</p>
            <p className="font-serif text-gold text-xs opacity-80">{city.country}</p>
          </div>
        </div>

        <p className="text-center font-serif italic text-gold mt-4 text-xs opacity-60">
          generated with Sternenhimmel — a digital planisphere
        </p>
      </div>
    );
  },
);
ShareCard.displayName = "ShareCard";