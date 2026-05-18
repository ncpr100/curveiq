import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ARCHETYPES,
  type ArchetypeId,
  GROUPS,
  METRIC_LABELS,
  METRIC_UNITS,
  MOCK_METRICS,
  MOCK_PATIENT,
  PROCEDURES,
  applyProcedures,
  computeCHI,
} from "@/lib/curveiq-data";
import { ScoreGauge } from "@/components/curveiq/ScoreGauge";
import { SilhouetteFigure } from "@/components/curveiq/SilhouetteFigure";
import { MetricsForm } from "@/components/curveiq/MetricsForm";
import type { PatientMetrics } from "@/lib/curveiq-data";

export const Route = createFileRoute("/")({
  component: CurveIQDashboard,
});

function CurveIQDashboard() {
  const [archetypeId, setArchetypeId] = useState<ArchetypeId>("classic_feminine");
  const [baseMetrics, setBaseMetrics] = useState<PatientMetrics>(MOCK_METRICS);
  const [procValues, setProcValues] = useState<Record<string, number>>(
    Object.fromEntries(PROCEDURES.map((p) => [p.id, p.default])),
  );

  const archetype = ARCHETYPES.find((a) => a.id === archetypeId)!;

  const baseline = useMemo(() => computeCHI(baseMetrics, archetype), [baseMetrics, archetype]);
  const projectedMetrics = useMemo(() => applyProcedures(baseMetrics, procValues), [baseMetrics, procValues]);
  const projected = useMemo(() => computeCHI(projectedMetrics, archetype), [projectedMetrics, archetype]);

  const totalProcs = Object.values(procValues).reduce((a, b) => a + b, 0);
  const isSimulating = totalProcs > 0;
  const delta = projected.chi - baseline.chi;

  const resetSim = () =>
    setProcValues(Object.fromEntries(PROCEDURES.map((p) => [p.id, p.default])));

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gradient-luxe)] text-[var(--ivory)] shadow-[var(--shadow-soft)]">
              <span className="font-serif text-lg italic">C</span>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground">CurveIQ</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Motor de Armonía Corporal · v3.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-medium text-secondary-foreground sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.13_150)]" />
              HIPAA · Desidentificado
            </span>
            <button className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90">
              Exportar PDF
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
        {/* Patient header */}
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Paciente</p>
            <h2 className="mt-1 font-serif text-3xl font-light tracking-tight text-foreground">
              {MOCK_PATIENT.initials}
              <span className="ml-3 text-base text-muted-foreground">· {MOCK_PATIENT.id}</span>
            </h2>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>{MOCK_PATIENT.age} años</span>
              <span>{MOCK_PATIENT.height_cm} cm</span>
              <span>{MOCK_PATIENT.weight_kg} kg</span>
              <span>Escaneo {MOCK_PATIENT.scan_date}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Arquetipo</span>
            <div className="flex flex-wrap gap-1.5">
              {ARCHETYPES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setArchetypeId(a.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    a.id === archetypeId
                      ? "bg-foreground text-background shadow-[var(--shadow-soft)]"
                      : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Silhouette panel */}
          <section className="lg:col-span-4">
            <div className="overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Silueta</h3>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {isSimulating ? "Simulación vs base" : "Escaneo base"}
                </span>
              </div>
              <div className="aspect-[2/5] w-full">
                <SilhouetteFigure
                  metrics={projectedMetrics}
                  ghost={isSimulating ? baseMetrics : undefined}
                />
              </div>
              {isSimulating ? (
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm bg-[var(--navy)]" /> Proyectada
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0 w-3 border-t border-dashed border-[var(--gold)]" /> Base
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Score panel */}
          <section className="lg:col-span-4">
            <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Índice de Armonía Corporal</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-secondary-foreground">
                  {archetype.name}
                </span>
              </div>
              <p className="mb-4 text-xs italic text-muted-foreground">{archetype.tagline}</p>

              <div className="flex flex-1 items-center justify-center py-2">
                <ScoreGauge score={projected.chi} delta={isSimulating ? delta : undefined} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {Object.entries(GROUPS).map(([key, g]) => {
                  const s = projected.subScores[key] ?? 0;
                  return (
                    <div key={key} className="rounded-xl bg-secondary/60 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {g.label}
                        </span>
                        <span className="text-xs tabular-nums text-foreground">{s.toFixed(0)}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-[var(--gradient-gold)] transition-[width] duration-500"
                          style={{ width: `${Math.min(100, s)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Simulator panel */}
          <section className="lg:col-span-4">
            <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Simulador de Procedimientos</h3>
                  <p className="text-[11px] text-muted-foreground">Ajusta para previsualizar la armonía proyectada</p>
                </div>
                <button
                  onClick={resetSim}
                  disabled={!isSimulating}
                  className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                >
                  Reiniciar
                </button>
              </div>

              <div className="space-y-5">
                {PROCEDURES.map((p) => {
                  const v = procValues[p.id] ?? 0;
                  return (
                    <div key={p.id}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{p.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {v ? `${v} ${p.unit}` : "—"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        value={v}
                        onChange={(e) =>
                          setProcValues((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                        }
                        className="curveiq-slider w-full"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-6">
                <div className="rounded-2xl bg-[var(--gradient-luxe)] p-4 text-[var(--ivory)]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] opacity-70">
                      CHI Proyectado
                    </span>
                    <span
                      className={`text-[10px] tabular-nums ${
                        delta >= 0 ? "text-[oklch(0.85_0.12_140)]" : "text-[oklch(0.78_0.15_25)]"
                      }`}
                    >
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-serif text-3xl font-light">{projected.chi.toFixed(1)}</span>
                    <span className="text-xs opacity-60">/ 100</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Measurements table */}
          <section className="lg:col-span-7">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Mediciones Antropométricas</h3>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  vs {archetype.name}
                </span>
              </div>
              <div className="grid gap-2.5">
                {Object.keys(METRIC_LABELS).map((key) => {
                  const range = archetype.ranges[key];
                  if (!range) return null;
                  const baseVal = (baseMetrics as unknown as Record<string, number>)[key];
                  const projVal = (projectedMetrics as unknown as Record<string, number>)[key];
                  const [low, high] = range;
                  const min = Math.min(low, baseVal, projVal) * 0.85;
                  const max = Math.max(high, baseVal, projVal) * 1.15;
                  const pct = (n: number) => ((n - min) / (max - min)) * 100;
                  const inRange = projVal >= low && projVal <= high;
                  const unit = METRIC_UNITS[key] ?? "";

                  return (
                    <div key={key} className="grid grid-cols-[140px_1fr_90px] items-center gap-3">
                      <span className="text-xs text-foreground">{METRIC_LABELS[key]}</span>
                      <div className="relative h-6 rounded-full bg-secondary/70">
                        <div
                          className="absolute inset-y-0 rounded-full bg-[oklch(0.92_0.04_140/0.5)]"
                          style={{
                            left: `${pct(low)}%`,
                            width: `${pct(high) - pct(low)}%`,
                          }}
                        />
                        <div
                          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-muted-foreground/70"
                          style={{ left: `${pct(baseVal)}%` }}
                          title="Base"
                        />
                        <div
                          className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow ${
                            inRange ? "bg-[oklch(0.55_0.13_150)]" : "bg-[var(--gold)]"
                          }`}
                          style={{ left: `${pct(projVal)}%` }}
                          title="Proyectada"
                        />
                      </div>
                      <span className="text-right text-xs tabular-nums text-foreground">
                        {projVal.toFixed(2)}
                        {unit}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm bg-[oklch(0.92_0.04_140/0.5)]" /> Rango ideal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/70" /> Base
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--gold)]" /> Proyectada
                </span>
              </div>
            </div>
          </section>

          {/* Insights */}
          <section className="lg:col-span-5">
            <div className="h-full rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Recomendaciones de Refinamiento</h3>
              {projected.insights.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">
                    Todas las métricas se encuentran dentro del rango ideal de {archetype.name.toLowerCase()}.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {projected.insights.slice(0, 5).map((ins) => (
                    <li
                      key={ins.metric}
                      className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3"
                    >
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gradient-gold)] text-[10px] font-semibold text-[var(--navy)]">
                        {ins.score.toFixed(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">
                          {METRIC_LABELS[ins.metric] ?? ins.metric}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Fuera del rango ideal — considerar ajuste procedimental.
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 rounded-2xl border border-dashed border-border p-4 text-[11px] leading-relaxed text-muted-foreground">
                <strong className="font-medium text-foreground">Plausibilidad 0.96.</strong> Las
                morfologías simuladas se mantienen dentro de los límites del modelo estadístico de forma.
                Solo para planificación quirúrgica — los resultados son ilustrativos y no predictivos.
              </div>
            </div>
          </section>

          {/* Editor de mediciones */}
          <section className="lg:col-span-12">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Editar Mediciones Antropométricas</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Ajusta los valores base y aplica para recalcular el CHI. Los errores de validación se mostrarán bajo cada campo.
                  </p>
                </div>
              </div>
              <MetricsForm
                key={MOCK_PATIENT.id + ":" + archetype.id}
                initialMetrics={baseMetrics}
                archetype={archetype}
                endpoint="/api/curveiq/score"
                onApplied={(m) => setBaseMetrics(m)}
              />
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/60 px-6 py-5 text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground lg:px-10">
        Motor CurveIQ · Compatible con HIPAA · Para uso de clínicos licenciados
      </footer>
    </div>
  );
}
