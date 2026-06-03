interface MoonPhaseProps {
  phaseAngle: number; // 0..360, 0=new, 180=full
  illumination: number;
  size?: number;
}

/**
 * Renders the moon with the illuminated portion lit.
 * phaseAngle convention from astronomy-engine MoonPhase():
 *   0   = New
 *   90  = First Quarter (right half lit, Northern Hemisphere view)
 *   180 = Full
 *   270 = Last Quarter (left half lit)
 */
export function MoonPhase({ phaseAngle, illumination, size = 120 }: MoonPhaseProps) {
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  // Compute the terminator as a half-ellipse offset on the disc.
  // k = cos(phaseAngle) gives signed terminator x-scale (-1 .. 1)
  const phaseRad = (phaseAngle * Math.PI) / 180;
  const k = Math.cos(phaseRad);
  const waxing = phaseAngle < 180;

  // Lit path: two arcs — the outer disc edge (right half if waxing) + the terminator ellipse.
  const rx = Math.abs(k) * r;

  // Sweep flags chosen so the lit area is on the correct side.
  let d: string;
  if (waxing) {
    // Right side fully lit edge + terminator ellipse
    if (k >= 0) {
      // Crescent or first quarter waxing: lit = right side outer arc + terminator on left (ellipse sweep)
      d = `M ${cx} ${cy - r}
           A ${r} ${r} 0 0 1 ${cx} ${cy + r}
           A ${rx} ${r} 0 0 ${k > 0 ? 0 : 1} ${cx} ${cy - r} Z`;
    } else {
      // Gibbous waxing (90<phase<180): lit covers more than half
      d = `M ${cx} ${cy - r}
           A ${r} ${r} 0 0 1 ${cx} ${cy + r}
           A ${rx} ${r} 0 0 1 ${cx} ${cy - r} Z`;
    }
  } else {
    if (k <= 0) {
      // Gibbous waning
      d = `M ${cx} ${cy - r}
           A ${r} ${r} 0 0 0 ${cx} ${cy + r}
           A ${rx} ${r} 0 0 0 ${cx} ${cy - r} Z`;
    } else {
      // Crescent waning
      d = `M ${cx} ${cy - r}
           A ${r} ${r} 0 0 0 ${cx} ${cy + r}
           A ${rx} ${r} 0 0 1 ${cx} ${cy - r} Z`;
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="moon-dark" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.25 0.02 250)" />
          <stop offset="100%" stopColor="oklch(0.12 0.02 250)" />
        </radialGradient>
        <radialGradient id="moon-lit" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="oklch(0.98 0.04 85)" />
          <stop offset="100%" stopColor="oklch(0.82 0.08 80)" />
        </radialGradient>
        <filter id="moon-label-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor="#fff2b8" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000814" floodOpacity="0.75" />
        </filter>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="url(#moon-dark)"
        stroke="var(--gold-deep)"
        strokeWidth="1"
      />
      <path d={d} fill="url(#moon-lit)" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1"
        opacity="0.5"
      />
      <text
        x={cx}
        y={size - 5}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="var(--gold-bright)"
        filter="url(#moon-label-glow)"
      >
        {Math.round(illumination * 100)}% lit
      </text>
    </svg>
  );
}
