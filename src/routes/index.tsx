import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { format } from "date-fns";
import { ChevronDown, Moon, Sun } from "lucide-react";
import { StarMap } from "@/components/StarMap";
import { MoonPhase } from "@/components/MoonPhase";
import { ShareCard } from "@/components/ShareCard";
import { type City } from "@/lib/cities";
import { createPersonalityReport, formatPlacement, type PersonalityAtlas } from "@/lib/personality";
import { computeMoon, computePlanets, computeStars, computeSun, type SkyInputs } from "@/lib/sky";
import { createTransitReport, type TransitAtlas } from "@/lib/transits";

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

type Theme = "light" | "dark";

function publicAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem("sky-theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

function Index() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [showTransitCalculator, setShowTransitCalculator] = useState(false);
  const [showCurrentPositions, setShowCurrentPositions] = useState(false);
  const [dateStr, setDateStr] = useState("1990-06-15");
  const [timeStr, setTimeStr] = useState("21:30");

  type WorldCity = [string, number, number];
  type WorldState = { n: string; c: WorldCity[] };
  type WorldCountry = { n: string; tz: string; s: WorldState[] };

  const [world, setWorld] = useState<WorldCountry[] | null>(null);
  const [personalityAtlas, setPersonalityAtlas] = useState<PersonalityAtlas | null>(null);
  const [transitAtlas, setTransitAtlas] = useState<TransitAtlas | null>(null);
  const [countryName, setCountryName] = useState("Kosovo");
  const [stateName, setStateName] = useState("");
  const [cityName, setCityName] = useState("Pristina");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("sky-theme", theme);
  }, [theme]);

  useEffect(() => {
    setCurrentDate(new Date());
    const interval = window.setInterval(() => setCurrentDate(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(publicAsset("world-cities.json"))
      .then((r) => r.json())
      .then((d: WorldCountry[]) => {
        if (!cancelled) setWorld(d);
      })
      .catch((e) => console.error("Failed to load world cities", e));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(publicAsset("personality-atlas.json"))
      .then((r) => r.json())
      .then((d: PersonalityAtlas) => {
        if (!cancelled) setPersonalityAtlas(d);
      })
      .catch((e) => console.error("Failed to load personality atlas", e));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(publicAsset("transit-interpretations.json"))
      .then((r) => r.json())
      .then((d: TransitAtlas) => {
        if (!cancelled) setTransitAtlas(d);
      })
      .catch((e) => console.error("Failed to load transit interpretations", e));
    return () => {
      cancelled = true;
    };
  }, []);

  const country = useMemo(
    () => world?.find((c) => c.n === countryName) ?? world?.[0],
    [world, countryName],
  );
  const stateObj = useMemo(
    () => country?.s.find((s) => s.n === stateName) ?? country?.s[0],
    [country, stateName],
  );
  const cityRow = useMemo(
    () => stateObj?.c.find((c) => c[0] === cityName) ?? stateObj?.c[0],
    [stateObj, cityName],
  );

  const city = useMemo<City>(() => {
    if (country && stateObj && cityRow) {
      return {
        name: cityRow[0],
        country: country.n,
        lat: cityRow[1],
        lon: cityRow[2],
        tz: country.tz,
      };
    }
    // Sensible fallback before data loads
    return {
      name: "Pristina",
      country: "Kosovo",
      lat: 42.6629,
      lon: 21.1655,
      tz: "Europe/Belgrade",
    };
  }, [country, stateObj, cityRow]);

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
  const personalityReport = useMemo(
    () =>
      personalityAtlas ? createPersonalityReport(input, moon.phaseName, personalityAtlas) : null,
    [input, moon.phaseName, personalityAtlas],
  );
  const transitReport = useMemo(
    () =>
      currentDate && transitAtlas && personalityReport
        ? createTransitReport(currentDate, personalityReport.placements, transitAtlas)
        : null,
    [currentDate, personalityReport, transitAtlas],
  );

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
    d
      ? new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: city.tz,
        }).format(d)
      : "—";

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto flex max-w-7xl justify-end px-4 pt-4">
        <button
          type="button"
          onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card/85 px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>

      {/* Header */}
      <header className="text-center pt-6 pb-8 px-4">
        <p className="font-sans font-semibold uppercase text-gold tracking-[0.22em] text-xs">
          DER STERNENHIMMEL
        </p>
        <h1 className="font-display text-gold-bright text-4xl md:text-6xl mt-3">
          The Sky When You Were Born
        </h1>
        <p className="font-serif italic text-muted-foreground mt-4 text-lg md:text-xl max-w-2xl mx-auto">
          Zu jeder Stunde des Jahres — a digital planisphere for any moment in history.
        </p>
      </header>

      <div className="max-w-7xl mx-auto px-4 pb-20 grid lg:grid-cols-[1fr_2fr] gap-8">
        {/* Controls */}
        <section className="ornate-border rounded-xl p-6 bg-card/85 backdrop-blur-sm h-fit">
          <h2 className="font-sans font-semibold uppercase text-gold tracking-[0.18em] text-xs mb-5">
            Observer
          </h2>

          <label className="block mb-3">
            <span className="font-sans font-medium text-muted-foreground text-sm">Country</span>
            <select
              value={countryName}
              onChange={(e) => {
                setCountryName(e.target.value);
                setStateName("");
                setCityName("");
              }}
              disabled={!world}
              className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-foreground font-sans text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {!world && <option>Loading…</option>}
              {world?.map((c) => (
                <option key={c.n} value={c.n}>
                  {c.n}
                </option>
              ))}
            </select>
          </label>

          <label className="block mb-3">
            <span className="font-sans font-medium text-muted-foreground text-sm">
              State / Region
            </span>
            <select
              value={stateObj?.n ?? ""}
              onChange={(e) => {
                setStateName(e.target.value);
                setCityName("");
              }}
              disabled={!country}
              className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-foreground font-sans text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {country?.s.map((s) => (
                <option key={s.n} value={s.n}>
                  {s.n}
                </option>
              ))}
            </select>
          </label>

          <label className="block mb-4">
            <span className="font-sans font-medium text-muted-foreground text-sm">Birth city</span>
            <select
              value={cityRow?.[0] ?? ""}
              onChange={(e) => setCityName(e.target.value)}
              disabled={!stateObj}
              className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-foreground font-sans text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {stateObj?.c.map((c) => (
                <option key={c[0]} value={c[0]}>
                  {c[0]}
                </option>
              ))}
            </select>
          </label>

          <label className="block mb-4">
            <span className="font-sans font-medium text-muted-foreground text-sm">Date</span>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-foreground font-sans text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>

          <label className="block mb-6">
            <span className="font-sans font-medium text-muted-foreground text-sm">
              Time (local)
            </span>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-foreground font-sans text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-sans text-muted-foreground text-sm">Sunrise</span>
              <span className="font-sans font-semibold text-gold-bright text-sm">
                {formatTime(sun.rise)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-muted-foreground text-sm">Sunset</span>
              <span className="font-sans font-semibold text-gold-bright text-sm">
                {formatTime(sun.set)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-muted-foreground text-sm">Visible stars</span>
              <span className="font-sans font-semibold text-gold-bright text-sm">
                {visibleStars}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-muted-foreground text-sm">Moon altitude</span>
              <span className="font-sans font-semibold text-gold-bright text-sm">
                {moon.alt > 0 ? `${moon.alt.toFixed(1)}° up` : "below horizon"}
              </span>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="mt-6 w-full font-sans font-semibold uppercase tracking-[0.12em] text-xs py-3 rounded-md bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            DOWNLOAD SHAREABLE CARD
          </button>
        </section>

        {/* Map + side info */}
        <section className="space-y-6">
          <div
            className="ornate-border sky-frame rounded-full mx-auto p-3 bg-night"
            style={{ width: "fit-content" }}
          >
            <StarMap input={input} size={560} ornate showLabels />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Moon panel */}
            <div className="ornate-border rounded-xl p-5 bg-card/85 flex items-center gap-4">
              <MoonPhase phaseAngle={moon.phaseAngle} illumination={moon.illumination} size={88} />
              <div>
                <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em]">
                  MOON
                </p>
                <p className="font-display text-gold-bright text-xl mt-1">{moon.phaseName}</p>
                <p className="font-sans text-muted-foreground text-xs mt-1">
                  {(moon.illumination * 100).toFixed(0)}% illuminated · phase{" "}
                  {moon.phaseAngle.toFixed(0)}°
                </p>
              </div>
            </div>

            {/* Planets panel */}
            <div className="ornate-border rounded-xl p-5 bg-card/85">
              <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em] mb-3">
                PLANETS
              </p>
              <ul className="space-y-1">
                {planets.map((p) => (
                  <li key={p.name} className="flex justify-between font-sans text-sm">
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

          <div className="ornate-border rounded-xl p-6 bg-card/85">
            <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em]">
                  PERSONALITY REPORT
                </p>
                <h2 className="font-display text-gold-bright text-2xl mt-1">
                  {personalityReport?.title ?? "Reading the sky..."}
                </h2>
              </div>
              {personalityReport && (
                <p className="font-sans font-semibold uppercase text-gold text-xs tracking-[0.16em]">
                  {personalityReport.dominantElement} · {personalityReport.dominantModality}
                </p>
              )}
            </div>

            {personalityReport ? (
              <div className="pt-5 space-y-5">
                <p className="font-serif text-foreground text-lg leading-relaxed">
                  {personalityReport.summary}
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em]">
                      SUN
                    </p>
                    <p className="font-sans font-semibold text-gold-bright mt-1">
                      {formatPlacement(personalityReport.sun)}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em]">
                      MOON
                    </p>
                    <p className="font-sans font-semibold text-gold-bright mt-1">
                      {formatPlacement(personalityReport.moon)}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em]">
                      VISIBLE PLANETS
                    </p>
                    <p className="font-sans font-semibold text-gold-bright mt-1">
                      {personalityReport.visiblePlanets.length
                        ? personalityReport.visiblePlanets.map((p) => p.name).join(", ")
                        : "None above horizon"}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em]">
                      FIXED STAR
                    </p>
                    <p className="font-sans font-semibold text-gold-bright mt-1">
                      {personalityReport.fixedStar?.star.name ?? "Below horizon"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {personalityReport.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded border border-border bg-secondary/80 px-2 py-1 font-sans font-medium text-xs text-gold"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em] mb-2">
                      STRENGTHS
                    </p>
                    <ul className="space-y-2 font-sans text-sm leading-relaxed text-foreground">
                      {personalityReport.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em] mb-2">
                      GROWTH EDGE
                    </p>
                    <ul className="space-y-2 font-sans text-sm leading-relaxed text-foreground">
                      {personalityReport.growth.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em] mb-2">
                      SKY NOTES
                    </p>
                    <ul className="space-y-2 font-sans text-sm leading-relaxed text-foreground">
                      {personalityReport.skyNotes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="font-sans text-muted-foreground text-xs">
                  For reflection and entertainment, not a scientific personality assessment.
                </p>
              </div>
            ) : (
              <p className="pt-5 font-sans text-muted-foreground text-sm">
                Loading the interpretation atlas...
              </p>
            )}
          </div>

          <div className="hidden ornate-border rounded-xl bg-card/85">
            <button
              type="button"
              onClick={() => setShowTransitCalculator((current) => !current)}
              aria-expanded={showTransitCalculator}
              className="flex w-full items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-secondary/35 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div>
                <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em]">
                  CURRENT PLANET POSITIONS
                </p>
                <h2 className="font-display text-gold-bright text-2xl mt-1">Transit Calculator</h2>
                {transitReport && (
                  <p className="font-sans text-muted-foreground text-xs mt-2">
                    Updated {format(transitReport.generatedAt, "MMM d, yyyy HH:mm")}
                  </p>
                )}
              </div>
              <ChevronDown
                className={`size-6 shrink-0 text-gold transition-transform ${
                  showTransitCalculator ? "rotate-180" : ""
                }`}
              />
            </button>

            {showTransitCalculator && transitReport ? (
              <div className="space-y-6 border-t border-border px-6 pb-6 pt-5">
                <div className="rounded-md border border-border bg-background/25">
                  <button
                    type="button"
                    onClick={() => setShowCurrentPositions((current) => !current)}
                    aria-expanded={showCurrentPositions}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <div>
                      <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em]">
                        Current positions
                      </p>
                      <p className="font-sans text-muted-foreground text-sm mt-1">
                        Sun, Moon, Mercury, Venus and planets by sign.
                      </p>
                    </div>
                    <ChevronDown
                      className={`size-5 shrink-0 text-gold transition-transform ${
                        showCurrentPositions ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showCurrentPositions && (
                    <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-5">
                      {transitReport.currentPositions.map((placement) => (
                        <div
                          key={placement.body}
                          className="rounded-md border border-border bg-secondary/50 px-3 py-3"
                        >
                          <p className="font-sans font-semibold uppercase text-gold text-[10px] tracking-[0.16em]">
                            {placement.body}
                          </p>
                          <p className="font-sans font-semibold text-gold-bright mt-1">
                            {formatPlacement(placement)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-sans font-semibold uppercase text-gold text-[11px] tracking-[0.18em]">
                        ACTIVE TRANSITS
                      </p>
                      <p className="font-sans text-muted-foreground text-sm mt-1">
                        Major aspects from current planets to your natal chart.
                      </p>
                    </div>
                    <p className="font-sans font-semibold text-gold-bright text-sm">
                      {transitReport.activeTransits.length}
                    </p>
                  </div>

                  {transitReport.activeTransits.length ? (
                    <div className="space-y-3">
                      {transitReport.activeTransits.map((transit) => (
                        <article
                          key={`${transit.transit.body}-${transit.aspect}-${transit.natal.body}-${transit.orb.toFixed(2)}`}
                          className="rounded-md border border-border bg-background/35 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="mb-1 font-sans font-semibold uppercase text-gold text-[10px] tracking-[0.16em]">
                                {transit.lifeTheme}
                              </p>
                              <h3 className="font-display text-gold-bright text-lg">
                                {transit.transit.body} {transit.aspect} natal {transit.natal.body}
                              </h3>
                              <p className="font-sans text-muted-foreground text-xs mt-1">
                                {formatPlacement(transit.transit)} to{" "}
                                {formatPlacement(transit.natal)} · orb {transit.orb.toFixed(1)}°
                              </p>
                            </div>
                            <span className="w-fit rounded-full border border-border bg-secondary/70 px-2 py-1 font-sans font-semibold uppercase tracking-[0.14em] text-[10px] text-gold">
                              {transit.tone}
                            </span>
                          </div>
                          <p className="mt-3 font-sans text-sm leading-relaxed text-foreground">
                            {transit.interpretation}
                          </p>
                          <p className="mt-2 font-serif italic text-muted-foreground text-sm">
                            {transit.prompt}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-border bg-background/35 p-4 font-sans text-sm text-muted-foreground">
                      No major transits are within the active orb right now.
                    </p>
                  )}
                </div>

                <p className="font-sans text-muted-foreground text-xs">
                  Transit interpretations are generated from{" "}
                  <span className="text-gold">transit-interpretations.json</span>.
                </p>
              </div>
            ) : showTransitCalculator ? (
              <p className="border-t border-border px-6 pb-6 pt-5 font-sans text-muted-foreground text-sm">
                Loading current positions and transit interpretations...
              </p>
            ) : null}
          </div>

          <p className="text-center font-serif italic text-muted-foreground text-sm">
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
