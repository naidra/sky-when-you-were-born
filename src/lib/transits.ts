import * as Astro from "astronomy-engine";
import { type Placement, type ZodiacSign } from "./personality";

export type AspectName = "Conjunction" | "Sextile" | "Square" | "Trine" | "Opposition";

export interface TransitAspectInterpretation {
  angle: number;
  family?: string;
  glyph?: string;
  tone: string;
  tempo?: string;
  summary: string;
  prompt: string;
  keywords?: string[];
  constructiveUse?: string;
  shadow?: string;
}

export interface TransitPlanetInterpretation {
  theme: string;
  summary: string;
  cycleSpeed?: string;
  typicalTransitDuration?: string;
  keywords?: string[];
  bestUse?: string;
  watchFor?: string;
}

export interface NatalBodyInterpretation {
  theme: string;
  question?: string;
}

export interface TransitComboInterpretation {
  focus: string;
  guidance: string;
}

export interface TransitAtlas {
  sourceNote: string;
  calculationModel?: Record<string, unknown>;
  aspectSets?: Record<string, string[]>;
  orbDegrees: Record<AspectName, number>;
  aspects: Record<AspectName, TransitAspectInterpretation>;
  minorOrbDegrees?: Record<string, number>;
  minorAspects?: Record<string, unknown>;
  motionStates?: Record<string, unknown>;
  transitPlanets: Record<string, TransitPlanetInterpretation>;
  natalBodies: Record<string, NatalBodyInterpretation>;
  comboTemplates?: Record<string, Record<string, TransitComboInterpretation>>;
}

export interface ActiveTransit {
  transit: Placement;
  natal: Placement;
  aspect: AspectName;
  orb: number;
  exactness: number;
  tone: string;
  interpretation: string;
  prompt: string;
}

export interface TransitReport {
  generatedAt: Date;
  currentPositions: Placement[];
  activeTransits: ActiveTransit[];
}

const SIGNS: ZodiacSign[] = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const TRANSIT_BODIES: { body: string; astroBody: Astro.Body | "Sun" | "Moon" }[] = [
  { body: "Sun", astroBody: "Sun" },
  { body: "Moon", astroBody: "Moon" },
  { body: "Mercury", astroBody: Astro.Body.Mercury },
  { body: "Venus", astroBody: Astro.Body.Venus },
  { body: "Mars", astroBody: Astro.Body.Mars },
  { body: "Jupiter", astroBody: Astro.Body.Jupiter },
  { body: "Saturn", astroBody: Astro.Body.Saturn },
  { body: "Uranus", astroBody: Astro.Body.Uranus },
  { body: "Neptune", astroBody: Astro.Body.Neptune },
  { body: "Pluto", astroBody: Astro.Body.Pluto },
];

const ASPECTS: { name: AspectName; angle: number }[] = [
  { name: "Conjunction", angle: 0 },
  { name: "Sextile", angle: 60 },
  { name: "Square", angle: 90 },
  { name: "Trine", angle: 120 },
  { name: "Opposition", angle: 180 },
];

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function longitudeToPlacement(body: string, longitude: number): Placement {
  const normalized = normalizeDegrees(longitude);
  return {
    body,
    sign: SIGNS[Math.floor(normalized / 30)],
    degree: normalized % 30,
    longitude: normalized,
  };
}

function eclipticLongitude(body: Astro.Body | "Sun" | "Moon", date: Date): number {
  if (body === "Sun") return Astro.SunPosition(date).elon;
  if (body === "Moon") return Astro.EclipticGeoMoon(date).lon;
  return Astro.Ecliptic(Astro.GeoVector(body, date, true)).elon;
}

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a - b));
  return diff > 180 ? 360 - diff : diff;
}

function buildInterpretation(
  transit: Placement,
  natal: Placement,
  aspect: AspectName,
  atlas: TransitAtlas,
): string {
  const transitText = atlas.transitPlanets[transit.body];
  const natalText = atlas.natalBodies[natal.body];
  const aspectText = atlas.aspects[aspect];
  const comboText = atlas.comboTemplates?.[transit.body]?.[natal.body];

  return [
    transitText.summary,
    `It is moving through ${aspect.toLowerCase()} to your natal ${natal.body}, touching ${natalText.theme}.`,
    comboText ? `${comboText.focus}: ${comboText.guidance}` : aspectText.summary,
    aspectText.constructiveUse ? `Constructive use: ${aspectText.constructiveUse}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function calculateCurrentPlanetPositions(date: Date): Placement[] {
  return TRANSIT_BODIES.map(({ body, astroBody }) =>
    longitudeToPlacement(body, eclipticLongitude(astroBody, date)),
  );
}

export function createTransitReport(
  generatedAt: Date,
  natalPlacements: Placement[],
  atlas: TransitAtlas,
): TransitReport {
  const currentPositions = calculateCurrentPlanetPositions(generatedAt);
  const natalByKnownBody = natalPlacements.filter((placement) => atlas.natalBodies[placement.body]);

  const activeTransits = currentPositions.flatMap((transit) =>
    natalByKnownBody.flatMap((natal) => {
      const separation = angularSeparation(transit.longitude, natal.longitude);
      const match = ASPECTS.map((candidate) => ({
        ...candidate,
        orb: Math.abs(separation - candidate.angle),
      })).find((candidate) => candidate.orb <= atlas.orbDegrees[candidate.name]);

      if (!match) return [];

      const aspectText = atlas.aspects[match.name];
      return {
        transit,
        natal,
        aspect: match.name,
        orb: match.orb,
        exactness: atlas.orbDegrees[match.name] - match.orb,
        tone: aspectText.tone,
        interpretation: buildInterpretation(transit, natal, match.name, atlas),
        prompt: aspectText.prompt,
      };
    }),
  );

  return {
    generatedAt,
    currentPositions,
    activeTransits: activeTransits
      .sort((a, b) => b.exactness - a.exactness || a.orb - b.orb)
      .slice(0, 8),
  };
}
