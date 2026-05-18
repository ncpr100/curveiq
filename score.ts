import { createFileRoute } from "@tanstack/react-router";
import {
  ARCHETYPES,
  POPULATION_SD,
  computeCHI,
  type Archetype,
  type PatientMetrics,
} from "@/lib/curveiq-data";

/**
 * Endpoint de puntuación CurveIQ.
 *
 * Aplica EXACTAMENTE la misma fórmula de plausibilidad que la validación local
 * de `MetricsForm`:
 *
 *     bounds = [ ideal_lo - tolerance_sd * SD, ideal_hi + tolerance_sd * SD ]
 *
 * Cualquier valor fuera de esos límites se devuelve como item de validación
 * compatible con FastAPI (status 422) para que `parseFastAPIValidation`
 * lo traduzca a `CURVEIQ_FIELD_MESSAGES.outOfRange(min, max)` con los
 * mismos números que mostró el formulario antes del envío.
 */

interface ScoreRequest {
  metrics?: Partial<Record<keyof PatientMetrics, unknown>> & Record<string, unknown>;
  archetype_id?: string;
  tolerance_sd?: number;
  strict?: boolean;
}

interface ValidationItem {
  loc: (string | number)[];
  msg: string;
  type: string;
  ctx?: { min?: number; max?: number };
}

const REQUIRED_KEYS: (keyof PatientMetrics)[] = [
  "waist_hip_ratio",
  "waist_shoulder_ratio",
  "bust_waist_ratio",
  "shoulder_hip_ratio",
  "body_fat_percent",
  "leg_torso_ratio",
  "gluteal_projection_cm",
  "abdomen_muscle_visibility",
];

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function plausibleBounds(
  archetype: Archetype,
  key: string,
  toleranceSD: number,
): [number, number] | null {
  const range = archetype.ranges[key];
  if (!range) return null;
  const sd = POPULATION_SD[key] ?? 0;
  const slack = sd * toleranceSD;
  return [round3(range[0] - slack), round3(range[1] + slack)];
}

function validationError(items: ValidationItem[]) {
  return new Response(JSON.stringify({ detail: items }), {
    status: 422,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/curveiq/score")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ScoreRequest;
        try {
          body = (await request.json()) as ScoreRequest;
        } catch {
          return validationError([
            { loc: ["body"], msg: "JSON inválido", type: "value_error.json" },
          ]);
        }

        // Modo estricto: query ?strict=1|true o body.strict === true
        const url = new URL(request.url);
        const strictQuery = url.searchParams.get("strict");
        const strict =
          body.strict === true ||
          strictQuery === "1" ||
          strictQuery === "true";

        // Arquetipo
        const archetype = ARCHETYPES.find((a) => a.id === body.archetype_id);
        if (!archetype) {
          return validationError([
            {
              loc: ["body", "archetype_id"],
              msg: "Arquetipo desconocido",
              type: "enum",
            },
          ]);
        }

        // Tolerancia
        const toleranceSD =
          typeof body.tolerance_sd === "number" && Number.isFinite(body.tolerance_sd)
            ? body.tolerance_sd
            : 3;
        if (toleranceSD < 0) {
          return validationError([
            {
              loc: ["body", "tolerance_sd"],
              msg: "Debe ser ≥ 0",
              type: "value_error.number.not_ge",
              ctx: { min: 0 },
            },
          ]);
        }

        const metrics = body.metrics ?? {};
        const items: ValidationItem[] = [];
        const parsed: Partial<Record<keyof PatientMetrics, number>> = {};

        if (strict) {
          const allowed = new Set<string>(REQUIRED_KEYS as string[]);
          for (const key of Object.keys(metrics)) {
            if (!allowed.has(key)) {
              items.push({
                loc: ["body", "metrics", key],
                msg: "Campo no permitido en modo estricto",
                type: "extra_forbidden",
              });
            }
          }
        }

        for (const key of REQUIRED_KEYS) {
          const raw = metrics[key];
          if (raw === undefined || raw === null || raw === "") {
            items.push({
              loc: ["body", "metrics", key],
              msg: "Campo requerido",
              type: "missing",
            });
            continue;
          }
          const n = typeof raw === "number" ? raw : Number(raw);
          if (!Number.isFinite(n)) {
            items.push({
              loc: ["body", "metrics", key],
              msg: "Valor numérico inválido",
              type: "type_error.float",
            });
            continue;
          }
          if (n < 0) {
            items.push({
              loc: ["body", "metrics", key],
              msg: "No puede ser negativo",
              type: "value_error.number.not_ge",
              ctx: { min: 0 },
            });
            continue;
          }
          const bounds = plausibleBounds(archetype, key, toleranceSD);
          if (bounds && (n < bounds[0] || n > bounds[1])) {
            items.push({
              loc: ["body", "metrics", key],
              msg: `Fuera del rango permitido [${bounds[0]}, ${bounds[1]}]`,
              type: "value_error.number.not_in_range",
              ctx: { min: bounds[0], max: bounds[1] },
            });
            continue;
          }
          parsed[key] = n;
        }

        if (items.length > 0) {
          return validationError(items);
        }

        const result = computeCHI(parsed as PatientMetrics, archetype);
        return Response.json({
          ok: true,
          archetype_id: archetype.id,
          tolerance_sd: toleranceSD,
          strict,
          metrics: parsed,
          chi: result.chi,
          sub_scores: result.subScores,
        });
      },
    },
  },
});
