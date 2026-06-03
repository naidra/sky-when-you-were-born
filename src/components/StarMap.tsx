import { useMemo } from "react";
import { BRIGHT_STARS, CONSTELLATIONS } from "@/lib/stars";
import {
  computeMoon,
  computePlanets,
  computeStars,
  projectStereographic,
  type SkyInputs,
} from "@/lib/sky";

interface StarMapProps {
  input: SkyInputs;
  size?: number;
  showLabels?: boolean;
  ornate?: boolean;
}

const PLANET_COLOR: Record<string, string> = {
  Mercury: "#c9b486",
  Venus: "#fff0c8",
  Mars: "#ff7755",
  Jupiter: "#f0c987",
  Saturn: "#e6c388",
  Uranus: "#8fd0d8",
  Neptune: "#7a9fff",
};

export function StarMap({ input, size = 560, showLabels = true, ornate = true }: StarMapProps) {
  const R = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  const { starsByName, stars, planets, moon } = useMemo(() => {
    const stars = computeStars(input);
    const planets = computePlanets(input);
    const moon = computeMoon(input);
    const starsByName = new Map(stars.map((s) => [s.star.name, s]));
    return { stars, planets, moon, starsByName };
  }, [input]);

  const toScreen = (alt: number, az: number) => {
    const { x, y } = projectStereographic(alt, az);
    return { x: cx + x * R, y: cy + y * R };
  };

  // Magnitude -> visual radius
  const starRadius = (mag: number) => {
    const r = Math.max(0.6, 3.4 - mag * 0.6);
    return r;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="sky-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.20 0.05 250)" />
          <stop offset="70%" stopColor="oklch(0.12 0.04 255)" />
          <stop offset="100%" stopColor="oklch(0.06 0.02 260)" />
        </radialGradient>
        <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8e0" stopOpacity="1" />
          <stop offset="60%" stopColor="#fff8e0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fff8e0" stopOpacity="0" />
        </radialGradient>
        <clipPath id="sky-clip">
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
      </defs>

      {/* Outer ornate ring */}
      {ornate && (
        <>
          <circle cx={cx} cy={cy} r={R + 2} fill="none" stroke="var(--gold-deep)" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={R - 1} fill="none" stroke="var(--gold)" strokeWidth="0.6" opacity="0.7" />
        </>
      )}

      {/* Sky disc */}
      <circle cx={cx} cy={cy} r={R} fill="url(#sky-bg)" />

      <g clipPath="url(#sky-clip)">
        {/* Cardinal direction lines (very subtle) */}
        <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="var(--gold-deep)" strokeWidth="0.3" opacity="0.3" />
        <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="var(--gold-deep)" strokeWidth="0.3" opacity="0.3" />

        {/* Altitude rings */}
        {[30, 60].map((alt) => {
          const r = Math.tan(((90 - alt) * Math.PI) / 180 / 2) * R;
          return (
            <circle key={alt} cx={cx} cy={cy} r={r} fill="none" stroke="var(--gold-deep)" strokeWidth="0.3" opacity="0.3" />
          );
        })}

        {/* Constellation lines */}
        {CONSTELLATIONS.map((c) =>
          c.lines.map(([a, b], i) => {
            const sa = starsByName.get(a);
            const sb = starsByName.get(b);
            if (!sa || !sb || sa.alt < 0 || sb.alt < 0) return null;
            const pa = toScreen(sa.alt, sa.az);
            const pb = toScreen(sb.alt, sb.az);
            return (
              <line
                key={`${c.name}-${i}`}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke="var(--gold)"
                strokeWidth="0.6"
                opacity="0.4"
              />
            );
          }),
        )}

        {/* Stars */}
        {stars.map((s) => {
          if (s.alt < 0) return null;
          const { x, y } = toScreen(s.alt, s.az);
          const r = starRadius(s.star.mag);
          return (
            <g key={s.star.name}>
              {s.star.mag < 1.5 && (
                <circle cx={x} cy={y} r={r * 3} fill="url(#star-glow)" opacity="0.5" />
              )}
              <circle cx={x} cy={y} r={r} fill="#fff8e0" />
              {showLabels && s.star.mag < 1.3 && (
                <text x={x + r + 3} y={y + 3} fontSize="9" fill="var(--gold)" opacity="0.85">
                  {s.star.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Planets */}
        {planets.map((p) => {
          if (!p.visible) return null;
          const { x, y } = toScreen(p.alt, p.az);
          const color = PLANET_COLOR[p.name] ?? "#fff";
          return (
            <g key={p.name}>
              <circle cx={x} cy={y} r={6} fill={color} opacity="0.25" />
              <circle cx={x} cy={y} r={3} fill={color} stroke="var(--gold)" strokeWidth="0.5" />
              {showLabels && (
                <text x={x + 6} y={y - 6} fontSize="10" fill={color} fontWeight="600">
                  {p.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Moon */}
        {moon.alt > 0 && (() => {
          const { x, y } = toScreen(moon.alt, moon.az);
          return (
            <g>
              <circle cx={x} cy={y} r={14} fill="#fff8e0" opacity="0.12" />
              <circle cx={x} cy={y} r={7} fill="#f5e6b8" stroke="var(--gold)" strokeWidth="0.6" />
              {showLabels && (
                <text x={x + 10} y={y + 4} fontSize="10" fill="var(--gold-bright)" fontWeight="600">
                  Moon
                </text>
              )}
            </g>
          );
        })()}
      </g>

      {/* Cardinal labels */}
      {ornate && (
        <g fontFamily="var(--font-display)" fontSize="12" fill="var(--gold)" textAnchor="middle">
          <text x={cx} y={18}>N</text>
          <text x={cx} y={size - 8}>S</text>
          <text x={14} y={cy + 4}>E</text>
          <text x={size - 14} y={cy + 4}>W</text>
        </g>
      )}
    </svg>
  );
}

// Re-export count helpers
export function summarizeSky(input: SkyInputs) {
  const stars = computeStars(input).filter((s) => s.alt > 0).length;
  const planets = computePlanets(input);
  return {
    visibleStars: stars,
    visiblePlanets: planets.filter((p) => p.visible),
    moon: computeMoon(input),
  };
}

export { BRIGHT_STARS };