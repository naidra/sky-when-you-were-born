import * as Astro from "astronomy-engine";
import { BRIGHT_STARS, type BrightStar } from "./stars";

export interface SkyInputs {
  date: Date; // a real UTC instant
  lat: number; // degrees
  lon: number; // degrees (east positive)
}

export interface StarPos {
  star: BrightStar;
  alt: number; // degrees
  az: number; // degrees, 0 = North, 90 = East
}

export interface PlanetPos {
  name: string;
  alt: number;
  az: number;
  magnitude: number;
  visible: boolean; // above horizon
  ra: number;
  dec: number;
}

export interface MoonInfo {
  alt: number;
  az: number;
  phaseAngle: number; // 0 = new, 180 = full
  illumination: number; // 0..1
  phaseName: string;
  ra: number;
  dec: number;
}

export interface SunInfo {
  alt: number;
  az: number;
  rise: Date | null;
  set: Date | null;
}

const PLANETS: { name: string; body: Astro.Body }[] = [
  { name: "Mercury", body: Astro.Body.Mercury },
  { name: "Venus", body: Astro.Body.Venus },
  { name: "Mars", body: Astro.Body.Mars },
  { name: "Jupiter", body: Astro.Body.Jupiter },
  { name: "Saturn", body: Astro.Body.Saturn },
  { name: "Uranus", body: Astro.Body.Uranus },
  { name: "Neptune", body: Astro.Body.Neptune },
];

function deg2rad(d: number) { return (d * Math.PI) / 180; }
function rad2deg(r: number) { return (r * 180) / Math.PI; }

// Local Sidereal Time in hours.
function lst(date: Date, lon: number): number {
  const gst = Astro.SiderealTime(date); // hours
  let h = gst + lon / 15;
  h = ((h % 24) + 24) % 24;
  return h;
}

// Convert RA (hours) / Dec (deg) to alt/az for observer at lat/lon at date.
export function equatorialToHorizontal(
  raHours: number,
  decDeg: number,
  date: Date,
  lat: number,
  lon: number,
): { alt: number; az: number } {
  const lstHours = lst(date, lon);
  let haHours = lstHours - raHours;
  haHours = ((haHours + 12) % 24 + 24) % 24 - 12;
  const HA = deg2rad(haHours * 15);
  const dec = deg2rad(decDeg);
  const phi = deg2rad(lat);
  const sinAlt = Math.sin(dec) * Math.sin(phi) + Math.cos(dec) * Math.cos(phi) * Math.cos(HA);
  const alt = Math.asin(sinAlt);
  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(phi)) / (Math.cos(alt) * Math.cos(phi));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(HA) > 0) az = 2 * Math.PI - az;
  return { alt: rad2deg(alt), az: rad2deg(az) };
}

export function computeStars(input: SkyInputs): StarPos[] {
  return BRIGHT_STARS.map((s) => {
    const { alt, az } = equatorialToHorizontal(s.ra, s.dec, input.date, input.lat, input.lon);
    return { star: s, alt, az };
  });
}

export function computePlanets(input: SkyInputs): PlanetPos[] {
  const observer = new Astro.Observer(input.lat, input.lon, 0);
  return PLANETS.map((p) => {
    const equ = Astro.Equator(p.body, input.date, observer, true, true);
    const hor = Astro.Horizon(input.date, observer, equ.ra, equ.dec, "normal");
    let mag = 0;
    try {
      const illum = Astro.Illumination(p.body, input.date);
      mag = illum.mag;
    } catch { mag = 0; }
    return {
      name: p.name,
      alt: hor.altitude,
      az: hor.azimuth,
      magnitude: mag,
      visible: hor.altitude > 0,
      ra: equ.ra,
      dec: equ.dec,
    };
  });
}

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

export function computeMoon(input: SkyInputs): MoonInfo {
  const observer = new Astro.Observer(input.lat, input.lon, 0);
  const equ = Astro.Equator(Astro.Body.Moon, input.date, observer, true, true);
  const hor = Astro.Horizon(input.date, observer, equ.ra, equ.dec, "normal");
  const phaseAngle = Astro.MoonPhase(input.date); // 0..360
  // Illumination fraction
  const illum = Astro.Illumination(Astro.Body.Moon, input.date);
  const idx = Math.floor(((phaseAngle + 22.5) % 360) / 45);
  return {
    alt: hor.altitude,
    az: hor.azimuth,
    phaseAngle,
    illumination: illum.phase_fraction,
    phaseName: PHASE_NAMES[idx],
    ra: equ.ra,
    dec: equ.dec,
  };
}

export function computeSun(input: SkyInputs): SunInfo {
  const observer = new Astro.Observer(input.lat, input.lon, 0);
  const equ = Astro.Equator(Astro.Body.Sun, input.date, observer, true, true);
  const hor = Astro.Horizon(input.date, observer, equ.ra, equ.dec, "normal");
  // Search rise/set within the same local day window (±24h from the input)
  const startSearch = new Date(input.date.getTime() - 12 * 3600 * 1000);
  let rise: Date | null = null;
  let set: Date | null = null;
  try {
    const r = Astro.SearchRiseSet(Astro.Body.Sun, observer, +1, startSearch, 2);
    rise = r ? r.date : null;
  } catch { rise = null; }
  try {
    const s = Astro.SearchRiseSet(Astro.Body.Sun, observer, -1, startSearch, 2);
    set = s ? s.date : null;
  } catch { set = null; }
  return { alt: hor.altitude, az: hor.azimuth, rise, set };
}

// Stereographic projection of an alt/az point onto a unit circle (zenith at center).
// Returns x,y in [-1,1]; only points with alt > horizonCut (default 0) are shown.
export function projectStereographic(altDeg: number, azDeg: number): { x: number; y: number } {
  // Zenith distance
  const z = deg2rad(90 - altDeg);
  // Stereographic radius from zenith
  const r = Math.tan(z / 2);
  // Azimuth measured from North, increasing East (clockwise viewed from above sky).
  // In planisphere convention (looking up), East is on the LEFT.
  const az = deg2rad(azDeg);
  const x = -r * Math.sin(az);
  const y = -r * Math.cos(az);
  return { x, y };
}