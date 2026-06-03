import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { format } from "date-fns";
import { StarMap } from "@/components/StarMap";
import { MoonPhase } from "@/components/MoonPhase";
import { ShareCard } from "@/components/ShareCard";
import { CITIES, type City } from "@/lib/cities";
import {
  computeMoon,
  computePlanets,
  computeStars,
  computeSun,
  type SkyInputs,
} from "@/lib/sky";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sternenhimmel — The Sky When You Were Born" },
      {
        name: "description",
        content:
          "A digital planisphere. Enter your birth date, time and city to see the exact star map, moon phase, planets and constellations above you.",
      },
      { property: "og:title", content: "Sternenhimmel — The Sky When You Were Born" },
      {
        property: "og:description",
        content:
          "Recreate the precise night sky of any moment in history. Antique planisphere in your browser.",
      },
    ],
  }),
  component: Index,
});

// Build a UTC Date from local date/time + IANA tz, using Intl trick.
function localToUTC(dateStr: string, timeStr: string, tz: string): Date {
  // dateStr: yyyy-mm-dd, timeStr: HH:mm
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  // Initial guess: treat as UTC, then correct by tz offset at that instant.
  const guessUTC = Date.UTC(y, m - 1, d, hh, mm);
  const tzOffsetMin = getTzOffsetMinutes(new Date(guessUTC), tz);
  return new Date(guessUTC - tzOffsetMin * 60_000);
}

function getTzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUTC - date.getTime()) / 60_000;
}

function Index() {
  const [dateStr, setDateStr] = useState("1990-06-15");
  const [timeStr, setTimeStr] = useState("21:30");
  const [cityName, setCityName] = useState("Pristina");
  const [customLat, setCustomLat] = useState("");
  const [customLon, setCustomLon] = useState("");

  const city = useMemo<City>(() => {
    if (cityName === "__custom") {
      const lat = parseFloat(customLat) || 0;
      const lon = parseFloat(customLon) || 0;
      return { name: "Custom", country: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon, tz: "UTC" };
    }
    return CITIES.find((c) => c.name === cityName) ?? CITIES[0];
  }, [cityName, customLat, customLon]);

  const utcDate = useMemo(() => localToUTC(dateStr, timeStr, city.tz), [dateStr, timeStr, city.tz]);
  const localDate = useMemo(() => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm);
  }, [dateStr, timeStr]);

  const input: SkyInputs = useMemo(
    () => ({ date: utcDate, lat: city.lat, lon: city.lon }),
    [utcDate, city.lat, city.lon],
  );

  const moon = useMemo(() => computeMoon(input), [input]);
  const planets = useMemo(() => computePlanets(input), [input]);
  const sun = useMemo(() => computeSun(input), [input]);
  const visibleStars = useMemo(() => computeStars(input).filter((s) => s.alt > 0).length, [input]);

  const shareRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!shareRef.current) return;
    try {
      const dataUrl = await toPng(shareRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `sky-above-${city.name.toLowerCase()}-${dateStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: city.tz }).format(d) : "—";

  return (
    <div className="min-h-screen text-foreground">
      {/* Header */}
      <header className="text-center pt-12 pb-6 px-4">
        <p className="font-display text-gold tracking-[0.4em] text-xs opacity-80">
          DER STERNENHIMMEL
        </p>
        <h1 className="font-display text-gold-bright text-4xl md:text-5xl mt-3 tracking-widest">
          The Sky When You Were Born
        </h1>
        <p className="font-serif italic text-gold mt-3 text-lg opacity-80 max-w-xl mx-auto">
          Zu jeder Stunde des Jahres — a digital planisphere for any moment in history.
        </p>
      </header>

      <div className="max-w-7xl mx-auto px-4 pb-20 grid lg:grid-cols-[1fr_2fr] gap-8">
        {/* Controls */}
        <section className="ornate-border rounded-xl p-6 bg-card/60 backdrop-blur-sm h-fit">
          <h2 className="font-display text-gold tracking-widest text-sm mb-4">OBSERVER</h2>

          <label className="block mb-4">
            <span className="font-serif text-gold text-sm">Birth city</span>
            <select
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}, {c.country}
                </option>
              ))}
              <option value="__custom">Custom coordinates…</option>
            </select>
          </label>

          {cityName === "__custom" && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <label className="block">
                <span className="font-serif text-gold text-xs">Latitude</span>
                <input
                  type="number"
                  step="0.0001"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  placeholder="42.6629"
                  className="mt-1 w-full bg-input border border-border rounded-md px-2 py-1.5 text-foreground font-serif"
                />
              </label>
              <label className="block">
                <span className="font-serif text-gold text-xs">Longitude</span>
                <input
                  type="number"
                  step="0.0001"
                  value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  placeholder="21.1655"
                  className="mt-1 w-full bg-input border border-border rounded-md px-2 py-1.5 text-foreground font-serif"
                />
              </label>
            </div>
          )}

          <label className="block mb-4">
            <span className="font-serif text-gold text-sm">Date</span>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]"
            />
          </label>

          <label className="block mb-6">
            <span className="font-serif text-gold text-sm">Time (local)</span>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-foreground font-serif focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]"
            />
          </label>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-serif text-gold opacity-80 text-sm">Sunrise</span>
              <span className="font-display text-gold-bright text-sm">{formatTime(sun.rise)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-serif text-gold opacity-80 text-sm">Sunset</span>
              <span className="font-display text-gold-bright text-sm">{formatTime(sun.set)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-serif text-gold opacity-80 text-sm">Visible stars</span>
              <span className="font-display text-gold-bright text-sm">{visibleStars}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-serif text-gold opacity-80 text-sm">Moon altitude</span>
              <span className="font-display text-gold-bright text-sm">
                {moon.alt > 0 ? `${moon.alt.toFixed(1)}° up` : "below horizon"}
              </span>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="mt-6 w-full font-display tracking-widest text-sm py-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity ornate-border"
          >
            DOWNLOAD SHAREABLE CARD
          </button>
        </section>

        {/* Map + side info */}
        <section className="space-y-6">
          <div className="ornate-border rounded-full mx-auto p-3 bg-card/40" style={{ width: "fit-content" }}>
            <StarMap input={input} size={560} ornate showLabels />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Moon panel */}
            <div className="ornate-border rounded-xl p-5 bg-card/60 flex items-center gap-4">
              <MoonPhase phaseAngle={moon.phaseAngle} illumination={moon.illumination} size={88} />
              <div>
                <p className="font-display text-gold text-[10px] tracking-widest opacity-70">MOON</p>
                <p className="font-serif text-gold-bright text-xl">{moon.phaseName}</p>
                <p className="font-serif text-gold text-xs opacity-80">
                  {(moon.illumination * 100).toFixed(0)}% illuminated · phase {moon.phaseAngle.toFixed(0)}°
                </p>
              </div>
            </div>

            {/* Planets panel */}
            <div className="ornate-border rounded-xl p-5 bg-card/60">
              <p className="font-display text-gold text-[10px] tracking-widest opacity-70 mb-2">
                PLANETS
              </p>
              <ul className="space-y-1">
                {planets.map((p) => (
                  <li key={p.name} className="flex justify-between font-serif text-sm">
                    <span className={p.visible ? "text-gold-bright" : "text-gold opacity-40"}>
                      {p.name}
                    </span>
                    <span className={p.visible ? "text-gold" : "text-gold opacity-40"}>
                      {p.visible
                        ? `${p.alt.toFixed(0)}° · mag ${p.magnitude.toFixed(1)}`
                        : "below horizon"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center font-serif italic text-gold opacity-60 text-sm">
            {format(localDate, "MMMM d, yyyy 'at' HH:mm")} · {city.name}, {city.country}
          </p>
        </section>
      </div>

      {/* Hidden share card for export */}
      <div className="fixed -left-[9999px] top-0">
        <ShareCard ref={shareRef} input={input} city={city} localDate={localDate} />
      </div>
    </div>
  );
}
