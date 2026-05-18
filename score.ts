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
  scenarios?: Array<{
    id?: string;
    metrics?: Partial<Record<keyof PatientMetrics, unknown>> & Record<string, unknown>;
  }>;
  recommend?: boolean;
}

interface ValidationItem {
  loc: (string | number)[];
  msg: string;
  type: string;
  ctx?: { min?: number; max?: number };
}

interface MetricExplanation {
  value: number;
  ideal_range: [number, number];
  plausible_range: [number, number];
  z_distance: number;
  status: "ideal" | "plausible";
}

interface ScenarioResponse {
  id: string;
  metrics: Partial<Record<keyof PatientMetrics, number>>;
  chi: number;
  sub_scores: Record<string, number>;
  explanations: Partial<Record<keyof PatientMetrics, MetricExplanation>>;
  risk_flags: Array<{ metric: string; reason: string; severity: "info" | "warning" }>;
}

const MODEL_VERSION = "curveiq-1.1.0";

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

function distanceToIdeal(value: number, range: [number, number]) {
  if (value < range[0]) return range[0] - value;
  if (value > range[1]) return value - range[1];
  return 0;
}

function buildExplainability(
  parsed: Partial<Record<keyof PatientMetrics, number>>,
  archetype: Archetype,
  toleranceSD: number,
) {
  const explanations: Partial<Record<keyof PatientMetrics, MetricExplanation>> = {};
  const riskFlags: Array<{ metric: string; reason: string; severity: "info" | "warning" }> = [];

  for (const key of REQUIRED_KEYS) {
    const value = parsed[key];
    const ideal = archetype.ranges[key];
    const plausible = plausibleBounds(archetype, key, toleranceSD);
    if (value == null || !ideal || !plausible) continue;

    const sd = POPULATION_SD[key] ?? 1;
    const idealDist = distanceToIdeal(value, ideal);
    const plausibleDistToEdge = Math.min(
      Math.abs(value - plausible[0]),
      Math.abs(plausible[1] - value),
    );
    const plausibleSpan = Math.max(plausible[1] - plausible[0], 1e-6);
    const nearLimit = plausibleDistToEdge / plausibleSpan <= 0.1;
    const outsideIdeal = idealDist > 0;

    explanations[key] = {
      value,
      ideal_range: [ideal[0], ideal[1]],
      plausible_range: [plausible[0], plausible[1]],
      z_distance: round3(idealDist / sd),
      status: outsideIdeal ? "plausible" : "ideal",
    };

    if (outsideIdeal) {
      riskFlags.push({
        metric: key,
        reason: "outside_ideal_range",
        severity: "warning",
      });
    }
    if (nearLimit) {
      riskFlags.push({
        metric: key,
        reason: "near_plausibility_limit",
        severity: "info",
      });
    }
  }

  return { explanations, riskFlags };
}

function validateMetrics(
  metrics: Partial<Record<keyof PatientMetrics, unknown>> & Record<string, unknown>,
  archetype: Archetype,
  toleranceSD: number,
  strict: boolean,
  locPrefix: (string | number)[],
) {
  const items: ValidationItem[] = [];
  const parsed: Partial<Record<keyof PatientMetrics, number>> = {};

  if (strict) {
    const allowed = new Set<string>(REQUIRED_KEYS as string[]);
    for (const key of Object.keys(metrics)) {
      if (!allowed.has(key)) {
        items.push({
          loc: [...locPrefix, key],
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
        loc: [...locPrefix, key],
        msg: "Campo requerido",
        type: "missing",
      });
      continue;
    }
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) {
      items.push({
        loc: [...locPrefix, key],
        msg: "Valor numérico inválido",
        type: "type_error.float",
      });
      continue;
    }
    if (n < 0) {
      items.push({
        loc: [...locPrefix, key],
        msg: "No puede ser negativo",
        type: "value_error.number.not_ge",
        ctx: { min: 0 },
      });
      continue;
    }
    const bounds = plausibleBounds(archetype, key, toleranceSD);
    if (bounds && (n < bounds[0] || n > bounds[1])) {
      items.push({
        loc: [...locPrefix, key],
        msg: `Fuera del rango permitido [${bounds[0]}, ${bounds[1]}]`,
        type: "value_error.number.not_in_range",
        ctx: { min: bounds[0], max: bounds[1] },
      });
      continue;
    }
    parsed[key] = n;
  }

  return { items, parsed };
}

function stddev(values: number[]) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
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

        if (Array.isArray(body.scenarios) && body.scenarios.length > 0) {
          const allItems: ValidationItem[] = [];
          const scored: ScenarioResponse[] = [];

          body.scenarios.forEach((scenario, index) => {
            const id =
              typeof scenario.id === "string" && scenario.id.trim().length > 0
                ? scenario.id.trim()
                : `scenario_${index + 1}`;
            const metrics = scenario.metrics ?? {};
            const validation = validateMetrics(
              metrics,
              archetype,
              toleranceSD,
              strict,
              ["body", "scenarios", index, "metrics"],
            );

            if (validation.items.length > 0) {
              allItems.push(...validation.items);
              return;
            }

            const result = computeCHI(validation.parsed as PatientMetrics, archetype);
            const explainability = buildExplainability(validation.parsed, archetype, toleranceSD);
            scored.push({
              id,
              metrics: validation.parsed,
              chi: result.chi,
              sub_scores: result.subScores,
              explanations: explainability.explanations,
              risk_flags: explainability.riskFlags,
            });
          });

          if (allItems.length > 0) {
            return validationError(allItems);
          }

          const ranking = [...scored]
            .sort((a, b) => b.chi - a.chi)
            .map((item) => ({ id: item.id, chi: round3(item.chi) }));

          const bestChi = ranking[0]?.id ?? null;
          const bestBalanced =
            scored.length === 0
              ? null
              : [...scored]
                  .sort((a, b) => {
                    const aSpread = stddev(Object.values(a.sub_scores));
                    const bSpread = stddev(Object.values(b.sub_scores));
                    const aScore = a.chi - aSpread;
                    const bScore = b.chi - bSpread;
                    return bScore - aScore;
                  })[0]?.id ?? null;

          return Response.json({
            ok: true,
            mode: body.recommend ? "recommend" : "batch",
            model_version: MODEL_VERSION,
            archetype_id: archetype.id,
            tolerance_sd: toleranceSD,
            strict,
            scenarios: scored,
            ranking,
            recommendation: {
              best_chi: bestChi,
              best_balanced: bestBalanced,
            },
          });
        }

        const validation = validateMetrics(
          body.metrics ?? {},
          archetype,
          toleranceSD,
          strict,
          ["body", "metrics"],
        );

        if (validation.items.length > 0) {
          return validationError(validation.items);
        }

        const result = computeCHI(validation.parsed as PatientMetrics, archetype);
        const explainability = buildExplainability(validation.parsed, archetype, toleranceSD);
        return Response.json({
          ok: true,
          mode: "single",
          model_version: MODEL_VERSION,
          archetype_id: archetype.id,
          tolerance_sd: toleranceSD,
          strict,
          metrics: validation.parsed,
          chi: result.chi,
          sub_scores: result.subScores,
          explanations: explainability.explanations,
          risk_flags: explainability.riskFlags,
        });
      },
    },
  },
});
