import * as Astro from "astronomy-engine";
import { computePlanets, computeStars, type PlanetPos, type SkyInputs, type StarPos } from "./sky";

export type ZodiacSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export type ElementName = "Fire" | "Earth" | "Air" | "Water";
export type ModalityName = "Cardinal" | "Fixed" | "Mutable";

export interface SignInterpretation {
  element: ElementName;
  modality: ModalityName;
  keywords: string[];
  summary: string;
  gift: string;
  watch: string;
}

export interface PersonalityAtlas {
  sourceNote: string;
  signs: Record<ZodiacSign, SignInterpretation>;
  elements: Record<ElementName, string>;
  modalities: Record<ModalityName, string>;
  planets: Record<string, string>;
  moonPhases: Record<string, string>;
}

export interface Placement {
  body: string;
  sign: ZodiacSign;
  degree: number;
  longitude: number;
}

export interface PersonalityReport {
  title: string;
  summary: string;
  sun: Placement;
  moon: Placement;
  placements: Placement[];
  dominantElement: ElementName;
  dominantModality: ModalityName;
  keywords: string[];
  strengths: string[];
  growth: string[];
  skyNotes: string[];
  visiblePlanets: PlanetPos[];
  fixedStar: StarPos | null;
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

const BODY_MAP: { body: string; astroBody: Astro.Body; weight: number }[] = [
  { body: "Mercury", astroBody: Astro.Body.Mercury, weight: 1 },
  { body: "Venus", astroBody: Astro.Body.Venus, weight: 1 },
  { body: "Mars", astroBody: Astro.Body.Mars, weight: 1 },
  { body: "Jupiter", astroBody: Astro.Body.Jupiter, weight: 0.75 },
  { body: "Saturn", astroBody: Astro.Body.Saturn, weight: 0.75 },
];

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function longitudeToPlacement(body: string, longitude: number): Placement {
  const normalized = normalizeDegrees(longitude);
  const signIndex = Math.floor(normalized / 30);
  return {
    body,
    sign: SIGNS[signIndex],
    degree: normalized % 30,
    longitude: normalized,
  };
}

function planetLongitude(body: Astro.Body, date: Date): number {
  const vector = Astro.GeoVector(body, date, true);
  return Astro.Ecliptic(vector).elon;
}

function topKey<T extends string>(scores: Record<T, number>): T {
  return Object.entries(scores).sort(([, a], [, b]) => Number(b) - Number(a))[0][0] as T;
}

function addScore<T extends string>(scores: Record<T, number>, key: T, weight: number) {
  scores[key] += weight;
}

export function createPersonalityReport(
  input: SkyInputs,
  moonPhaseName: string,
  atlas: PersonalityAtlas,
): PersonalityReport {
  const sun = longitudeToPlacement("Sun", Astro.SunPosition(input.date).elon);
  const moon = longitudeToPlacement("Moon", Astro.EclipticGeoMoon(input.date).lon);
  const planetPlacements = BODY_MAP.map(({ body, astroBody }) =>
    longitudeToPlacement(body, planetLongitude(astroBody, input.date)),
  );
  const placements = [sun, moon, ...planetPlacements];

  const elementScores: Record<ElementName, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalityScores: Record<ModalityName, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };

  placements.forEach((placement) => {
    const atlasSign = atlas.signs[placement.sign];
    const bodyWeight =
      placement.body === "Sun" || placement.body === "Moon"
        ? 3
        : (BODY_MAP.find((item) => item.body === placement.body)?.weight ?? 1);
    addScore(elementScores, atlasSign.element, bodyWeight);
    addScore(modalityScores, atlasSign.modality, bodyWeight);
  });

  const visiblePlanets = computePlanets(input).filter((planet) => planet.visible);
  const fixedStar =
    computeStars(input)
      .filter((star) => star.alt > 0)
      .sort((a, b) => a.star.mag - b.star.mag || b.alt - a.alt)[0] ?? null;

  const dominantElement = topKey(elementScores);
  const dominantModality = topKey(modalityScores);
  const sunText = atlas.signs[sun.sign];
  const moonText = atlas.signs[moon.sign];
  const moonPhaseText = atlas.moonPhases[moonPhaseName];
  const visiblePlanetNotes = visiblePlanets
    .slice()
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, 2)
    .map((planet) => atlas.planets[planet.name])
    .filter(Boolean);

  return {
    title: `${sun.sign} Sun · ${moon.sign} Moon`,
    summary: `${sunText.summary} Emotionally, ${moonText.summary.charAt(0).toLowerCase()}${moonText.summary.slice(1)}`,
    sun,
    moon,
    placements,
    dominantElement,
    dominantModality,
    keywords: Array.from(new Set([...sunText.keywords, ...moonText.keywords])).slice(0, 6),
    strengths: [sunText.gift, moonText.gift, atlas.elements[dominantElement]],
    growth: [sunText.watch, moonText.watch, atlas.modalities[dominantModality]],
    skyNotes: [
      moonPhaseText,
      ...visiblePlanetNotes,
      fixedStar
        ? `${fixedStar.star.name} was one of the strongest visible fixed-star anchors, lending the report a ${fixedStar.star.con} signature from the actual sky overhead.`
        : "No bright fixed-star anchor was above the horizon in the current star catalog for this moment.",
    ].filter(Boolean),
    visiblePlanets,
    fixedStar,
  };
}

export function formatPlacement(placement: Placement): string {
  return `${placement.degree.toFixed(1)}° ${placement.sign}`;
}
