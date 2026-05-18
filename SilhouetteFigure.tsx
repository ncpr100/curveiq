import type { PatientMetrics } from "@/lib/curveiq-data";

interface Props {
  metrics: PatientMetrics;
  ghost?: PatientMetrics;
  label?: string;
}

// Builds a stylized front-view silhouette path from ratios.
// Coordinates are in a 200x520 viewBox.
function buildPath(m: PatientMetrics): string {
  const cx = 100;
  // Base widths
  const shoulder = 56;
  const hip = shoulder / m.shoulder_hip_ratio;
  const waist = hip * m.waist_hip_ratio;
  const bust = waist * m.bust_waist_ratio;
  const glutY = 290;
  const waistY = 230;
  const bustY = 165;
  const shoulderY = 110;

  const sH = shoulder / 2;
  const wH = waist / 2;
  const bH = bust / 2;
  const hH = hip / 2;
  const gPush = m.gluteal_projection_cm * 0.6;

  return `
    M ${cx} 40
    C ${cx + 18} 40 ${cx + 22} 80 ${cx + 14} 95
    L ${cx + sH} ${shoulderY}
    C ${cx + sH + 6} 130 ${cx + bH} 150 ${cx + bH} ${bustY}
    C ${cx + bH} 195 ${cx + wH} 215 ${cx + wH} ${waistY}
    C ${cx + wH} 255 ${cx + hH + gPush * 0.4} 270 ${cx + hH} ${glutY}
    C ${cx + hH - 4} 360 ${cx + hH - 10} 420 ${cx + 18} 500
    L ${cx - 18} 500
    C ${cx - hH + 10} 420 ${cx - hH + 4} 360 ${cx - hH} ${glutY}
    C ${cx - hH - gPush * 0.4} 270 ${cx - wH} 255 ${cx - wH} ${waistY}
    C ${cx - wH} 215 ${cx - bH} 195 ${cx - bH} ${bustY}
    C ${cx - bH} 150 ${cx - sH - 6} 130 ${cx - sH} ${shoulderY}
    C ${cx - 22} 80 ${cx - 18} 40 ${cx} 40
    Z
  `;
}

export function SilhouetteFigure({ metrics, ghost, label }: Props) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 200 520" className="h-full w-full max-h-[480px]" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="sil-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.32 0.05 245)" />
            <stop offset="100%" stopColor="oklch(0.22 0.04 250)" />
          </linearGradient>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="oklch(0.92 0.01 80)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="200" height="520" fill="url(#grid)" opacity="0.6" />
        {ghost ? (
          <path
            d={buildPath(ghost)}
            fill="none"
            stroke="oklch(0.74 0.11 35)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.7"
          />
        ) : null}
        <path
          d={buildPath(metrics)}
          fill="url(#sil-grad)"
          stroke="oklch(0.18 0.02 250)"
          strokeWidth="0.8"
          style={{ transition: "d 500ms ease" }}
        />
      </svg>
      {label ? (
        <span className="absolute bottom-2 left-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
