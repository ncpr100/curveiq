import { useState } from "react";
import {
  METRIC_LABELS,
  METRIC_UNITS,
  POPULATION_SD,
  type Archetype,
  type PatientMetrics,
} from "@/lib/curveiq-data";
import {
  CURVEIQ_FIELD_MESSAGES,
  CurveIQApiError,
  curveIQErrorFromResponse,
  toCurveIQError,
} from "@/lib/curveiq-errors";

interface MetricsFormProps {
  initialMetrics: PatientMetrics;
  /** Arquetipo seleccionado: sus rangos definen los límites de plausibilidad. */
  archetype: Archetype;
  /** Tolerancia (en SD poblacionales) fuera del rango ideal antes de marcar error. Por defecto 3. */
  toleranceSD?: number;
  /** Endpoint del motor de puntuación. Si no se define, el envío es local. */
  endpoint?: string;
  onApplied?: (metrics: PatientMetrics) => void;
}

type FormState = Record<keyof PatientMetrics, string>;

function toFormState(m: PatientMetrics): FormState {
  return Object.fromEntries(
    Object.entries(m).map(([k, v]) => [k, String(v)]),
  ) as FormState;
}

export function MetricsForm({
  initialMetrics,
  archetype,
  toleranceSD: initialToleranceSD = 3,
  endpoint,
  onApplied,
}: MetricsFormProps) {
  const [values, setValues] = useState<FormState>(toFormState(initialMetrics));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toleranceSD, setToleranceSD] = useState<number>(initialToleranceSD);

  const setField = (key: keyof PatientMetrics, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  /** Límites de plausibilidad: rango ideal del arquetipo ± toleranceSD * SD poblacional. */
  const plausibleBounds = (key: string): [number, number] | null => {
    const range = archetype.ranges[key];
    if (!range) return null;
    const sd = POPULATION_SD[key] ?? 0;
    const slack = sd * toleranceSD;
    const lo = +(range[0] - slack).toFixed(3);
    const hi = +(range[1] + slack).toFixed(3);
    return [lo, hi];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Conversión numérica + validación de rango por arquetipo.
    const parsed: Partial<PatientMetrics> = {};
    const localErrors: Record<string, string> = {};
    for (const [k, raw] of Object.entries(values)) {
      const n = Number(raw);
      if (raw === "" || Number.isNaN(n)) {
        localErrors[k] = CURVEIQ_FIELD_MESSAGES.numeric;
        continue;
      }
      if (n < 0) {
        localErrors[k] = CURVEIQ_FIELD_MESSAGES.negative;
        continue;
      }
      const bounds = plausibleBounds(k);
      if (bounds && (n < bounds[0] || n > bounds[1])) {
        localErrors[k] = CURVEIQ_FIELD_MESSAGES.outOfRange(bounds[0], bounds[1]);
        continue;
      }
      (parsed as Record<string, number>)[k] = n;
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setFormError(
        `Hay ${Object.keys(localErrors).length} campo(s) fuera de los límites de plausibilidad para el arquetipo ${archetype.name}.`,
      );
      return;
    }

    // Sin endpoint configurado: aplicar localmente.
    if (!endpoint) {
      onApplied?.(parsed as PatientMetrics);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: parsed,
          tolerance_sd: toleranceSD,
          archetype_id: archetype.id,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw await curveIQErrorFromResponse(res);
      onApplied?.(parsed as PatientMetrics);
    } catch (err) {
      const apiErr: CurveIQApiError = toCurveIQError(err);
      if (apiErr.fieldErrors && Object.keys(apiErr.fieldErrors).length > 0) {
        // Normaliza paths anidados (p. ej. "metrics.waist_hip_ratio") al nombre de campo.
        const normalized: Record<string, string> = {};
        for (const [path, msg] of Object.entries(apiErr.fieldErrors)) {
          const leaf = path.split(".").pop() ?? path;
          normalized[leaf] = msg;
        }
        setFieldErrors(normalized);
        setFormError(apiErr.message);
      } else {
        setFormError(apiErr.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <label htmlFor="tolerance-sd" className="font-medium text-foreground">
            Tolerancia de plausibilidad
            <span className="ml-1 text-muted-foreground">
              (±{toleranceSD.toFixed(1)} SD del rango ideal)
            </span>
          </label>
          <button
            type="button"
            onClick={() => {
              setToleranceSD(initialToleranceSD);
              setFieldErrors({});
              setFormError(null);
            }}
            className="text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            Restablecer ({initialToleranceSD})
          </button>
        </div>
        <input
          id="tolerance-sd"
          type="range"
          min={0.5}
          max={6}
          step={0.5}
          value={toleranceSD}
          onChange={(e) => {
            setToleranceSD(Number(e.target.value));
            setFieldErrors({});
            setFormError(null);
          }}
          className="curveiq-slider mt-2 w-full"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>Estricto · 0.5</span>
          <span>Permisivo · 6</span>
        </div>
      </div>

      <div className="grid gap-3">
        {(Object.keys(initialMetrics) as (keyof PatientMetrics)[]).map((key) => {
          const label = METRIC_LABELS[key] ?? key;
          const unit = METRIC_UNITS[key] ?? "";
          const err = fieldErrors[key as string];
          const inputId = `metric-${key}`;
          const ideal = archetype.ranges[key];
          const bounds = plausibleBounds(key);
          return (
            <div key={key} className="grid grid-cols-[1fr_120px] items-start gap-3">
              <label
                htmlFor={inputId}
                className="pt-2 text-xs font-medium text-foreground"
              >
                {label}
                {unit ? (
                  <span className="ml-1 text-muted-foreground">({unit.trim()})</span>
                ) : null}
              </label>
              <div>
                <input
                  id={inputId}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={values[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  aria-invalid={!!err}
                  aria-describedby={err ? `${inputId}-error` : undefined}
                  className={`w-full rounded-md border bg-background px-2 py-1.5 text-right text-xs tabular-nums text-foreground outline-none transition focus:ring-2 focus:ring-ring ${
                    err
                      ? "border-destructive focus:ring-destructive/40"
                      : "border-border focus:border-foreground/40"
                  }`}
                />
                {err ? (
                  <p
                    id={`${inputId}-error`}
                    role="alert"
                    className="mt-1 text-[10px] font-medium text-destructive"
                  >
                    {err}
                  </p>
                ) : ideal && bounds ? (
                  <p className="mt-1 text-right text-[10px] text-muted-foreground tabular-nums">
                    Ideal {ideal[0]}–{ideal[1]} · permitido {bounds[0]}–{bounds[1]}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {formError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
        >
          {formError}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setValues(toFormState(initialMetrics));
            setFieldErrors({});
            setFormError(null);
          }}
          className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
        >
          Restablecer
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Calculando…" : "Aplicar mediciones"}
        </button>
      </div>
    </form>
  );
}
