export type ArchetypeId =
  | "classic_feminine"
  | "athletic_aesthetic"
  | "natural_harmony"
  | "surgical_doll";

export interface Archetype {
  id: ArchetypeId;
  name: string;
  tagline: string;
  ranges: Record<string, [number, number]>;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "classic_feminine",
    name: "Femenino Clásico",
    tagline: "Reloj de arena — proporción atemporal",
    ranges: {
      waist_hip_ratio: [0.68, 0.72],
      waist_shoulder_ratio: [0.68, 0.74],
      bust_waist_ratio: [1.35, 1.45],
      shoulder_hip_ratio: [1.0, 1.1],
      body_fat_percent: [21, 28],
      leg_torso_ratio: [1.3, 1.42],
      gluteal_projection_cm: [6.5, 8.5],
      abdomen_muscle_visibility: [0.1, 0.4],
    },
  },
  {
    id: "athletic_aesthetic",
    name: "Estética Atlética",
    tagline: "Esbelta — definida, orientada al rendimiento",
    ranges: {
      waist_hip_ratio: [0.72, 0.78],
      waist_shoulder_ratio: [0.6, 0.66],
      bust_waist_ratio: [1.25, 1.35],
      shoulder_hip_ratio: [1.1, 1.2],
      body_fat_percent: [15, 22],
      leg_torso_ratio: [1.35, 1.45],
      gluteal_projection_cm: [5, 7],
      abdomen_muscle_visibility: [0.3, 0.7],
    },
  },
  {
    id: "natural_harmony",
    name: "Armonía Natural",
    tagline: "Base de la paciente — refinada, no remodelada",
    ranges: {
      waist_hip_ratio: [0.7, 0.76],
      waist_shoulder_ratio: [0.66, 0.74],
      bust_waist_ratio: [1.3, 1.42],
      shoulder_hip_ratio: [1.0, 1.12],
      body_fat_percent: [20, 27],
      leg_torso_ratio: [1.32, 1.42],
      gluteal_projection_cm: [6, 8],
      abdomen_muscle_visibility: [0.15, 0.45],
    },
  },
  {
    id: "surgical_doll",
    name: "Silueta Esculpida",
    tagline: "Dramática — curvas de alto contraste",
    ranges: {
      waist_hip_ratio: [0.63, 0.68],
      waist_shoulder_ratio: [0.65, 0.72],
      bust_waist_ratio: [1.45, 1.55],
      shoulder_hip_ratio: [0.95, 1.05],
      body_fat_percent: [18, 25],
      leg_torso_ratio: [1.3, 1.42],
      gluteal_projection_cm: [7.5, 9.5],
      abdomen_muscle_visibility: [0.15, 0.4],
    },
  },
];

export const POPULATION_SD: Record<string, number> = {
  waist_hip_ratio: 0.06,
  waist_shoulder_ratio: 0.05,
  bust_waist_ratio: 0.08,
  shoulder_hip_ratio: 0.07,
  body_fat_percent: 5,
  leg_torso_ratio: 0.05,
  gluteal_projection_cm: 1.5,
  abdomen_muscle_visibility: 0.2,
};

export const METRIC_LABELS: Record<string, string> = {
  waist_hip_ratio: "Relación Cintura–Cadera",
  waist_shoulder_ratio: "Relación Cintura–Hombros",
  bust_waist_ratio: "Relación Busto–Cintura",
  shoulder_hip_ratio: "Relación Hombros–Cadera",
  body_fat_percent: "Grasa Corporal %",
  leg_torso_ratio: "Relación Piernas–Torso",
  gluteal_projection_cm: "Proyección Glútea",
  abdomen_muscle_visibility: "Definición Abdominal",
};

export const METRIC_UNITS: Record<string, string> = {
  body_fat_percent: "%",
  gluteal_projection_cm: " cm",
};

export const GROUPS: Record<string, { label: string; keys: string[]; weight: number }> = {
  proportions: {
    label: "Proporciones",
    keys: ["waist_hip_ratio", "waist_shoulder_ratio", "shoulder_hip_ratio", "leg_torso_ratio"],
    weight: 0.3,
  },
  breast: { label: "Equilibrio del Busto", keys: ["bust_waist_ratio"], weight: 0.2 },
  contour: {
    label: "Contorno",
    keys: ["gluteal_projection_cm", "abdomen_muscle_visibility"],
    weight: 0.25,
  },
  composition: { label: "Composición", keys: ["body_fat_percent"], weight: 0.25 },
};

export interface PatientMetrics {
  waist_hip_ratio: number;
  waist_shoulder_ratio: number;
  bust_waist_ratio: number;
  shoulder_hip_ratio: number;
  body_fat_percent: number;
  leg_torso_ratio: number;
  gluteal_projection_cm: number;
  abdomen_muscle_visibility: number;
}

export const MOCK_PATIENT = {
  id: "P-2024-0918",
  initials: "M.R.",
  age: 32,
  height_cm: 168,
  weight_kg: 64,
  scan_date: "2026-05-12",
};

export const MOCK_METRICS: PatientMetrics = {
  waist_hip_ratio: 0.74,
  waist_shoulder_ratio: 0.72,
  bust_waist_ratio: 1.32,
  shoulder_hip_ratio: 1.04,
  body_fat_percent: 26.5,
  leg_torso_ratio: 1.34,
  gluteal_projection_cm: 6.2,
  abdomen_muscle_visibility: 0.22,
};

export interface Procedure {
  id: string;
  label: string;
  affects: { metric: keyof PatientMetrics; perUnit: number }[];
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export const PROCEDURES: Procedure[] = [
  {
    id: "waist_lipo",
    label: "Lipoescultura de Cintura",
    affects: [
      { metric: "waist_hip_ratio", perUnit: -0.008 },
      { metric: "waist_shoulder_ratio", perUnit: -0.008 },
      { metric: "bust_waist_ratio", perUnit: 0.015 },
    ],
    unit: "cm",
    min: 0,
    max: 10,
    step: 0.5,
    default: 0,
  },
  {
    id: "bbl",
    label: "Aumento Glúteo",
    affects: [
      { metric: "gluteal_projection_cm", perUnit: 0.4 },
      { metric: "waist_hip_ratio", perUnit: -0.004 },
    ],
    unit: "cc × 100",
    min: 0,
    max: 8,
    step: 1,
    default: 0,
  },
  {
    id: "breast_aug",
    label: "Aumento Mamario",
    affects: [{ metric: "bust_waist_ratio", perUnit: 0.025 }],
    unit: "cc × 50",
    min: 0,
    max: 8,
    step: 1,
    default: 0,
  },
  {
    id: "abdomen_def",
    label: "Marcación Abdominal",
    affects: [
      { metric: "abdomen_muscle_visibility", perUnit: 0.05 },
      { metric: "body_fat_percent", perUnit: -0.4 },
    ],
    unit: "intensidad",
    min: 0,
    max: 5,
    step: 1,
    default: 0,
  },
];

function scoreMetric(value: number, range: [number, number], sd: number): number {
  const [low, high] = range;
  if (value >= low && value <= high) return 100;
  const dist = value < low ? low - value : value - high;
  return 100 * Math.exp(-0.5 * Math.pow(dist / sd, 2));
}

export function computeCHI(metrics: PatientMetrics, archetype: Archetype) {
  const subScores: Record<string, number> = {};
  const insights: { metric: string; score: number }[] = [];

  for (const [groupKey, group] of Object.entries(GROUPS)) {
    let total = 0;
    let count = 0;
    for (const key of group.keys) {
      const range = archetype.ranges[key];
      const val = (metrics as unknown as Record<string, number>)[key];
      if (range == null || val == null) continue;
      const s = scoreMetric(val, range, POPULATION_SD[key] ?? 1);
      total += s;
      count++;
      if (s < 80) insights.push({ metric: key, score: s });
    }
    subScores[groupKey] = count ? total / count : 0;
  }

  const chi = Object.entries(GROUPS).reduce(
    (acc, [k, g]) => acc + (subScores[k] ?? 0) * g.weight,
    0,
  );

  insights.sort((a, b) => a.score - b.score);
  return { chi, subScores, insights };
}

export function applyProcedures(
  base: PatientMetrics,
  values: Record<string, number>,
): PatientMetrics {
  const next: PatientMetrics = { ...base };
  for (const proc of PROCEDURES) {
    const v = values[proc.id] ?? 0;
    if (!v) continue;
    for (const eff of proc.affects) {
      next[eff.metric] = +(next[eff.metric] + eff.perUnit * v).toFixed(4);
    }
  }
  return next;
}
