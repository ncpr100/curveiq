import { describe, it, expect } from "vitest";

/**
 * Prueba de integración del endpoint POST /api/curveiq/score.
 *
 * Requiere un servidor en ejecución. Por defecto apunta a
 * http://localhost:8080 (dev server de Vite). Puedes sobreescribir
 * la base con la variable de entorno CURVEIQ_BASE_URL.
 */
const BASE_URL = process.env.CURVEIQ_BASE_URL ?? "http://localhost:8080";
const ENDPOINT = `${BASE_URL}/api/curveiq/score`;

const VALID_METRICS = {
  waist_hip_ratio: 0.7,
  waist_shoulder_ratio: 0.62,
  bust_waist_ratio: 1.3,
  shoulder_hip_ratio: 1.0,
  body_fat_percent: 22,
  leg_torso_ratio: 1.35,
  gluteal_projection_cm: 5,
  abdomen_muscle_visibility: 0.3,
};

describe("POST /api/curveiq/score", () => {
  it("retorna 422 con errores por campo cuando los datos están fuera de rango", async () => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archetype_id: "classic_feminine",
        tolerance_sd: 1,
        metrics: {
          ...VALID_METRICS,
          // Fuera de rango: leg_torso_ratio y abdomen_muscle_visibility
          leg_torso_ratio: 1.0,
          abdomen_muscle_visibility: 5,
        },
      }),
    });

    expect(res.status).toBe(422);
    const json = (await res.json()) as {
      detail: Array<{
        loc: (string | number)[];
        msg: string;
        type: string;
        ctx?: { min?: number; max?: number };
      }>;
    };
    expect(Array.isArray(json.detail)).toBe(true);

    const fields = json.detail.map((d) => d.loc[d.loc.length - 1]);
    expect(fields).toContain("leg_torso_ratio");
    expect(fields).toContain("abdomen_muscle_visibility");

    for (const item of json.detail) {
      expect(item.type).toBe("value_error.number.not_in_range");
      expect(typeof item.msg).toBe("string");
      expect(item.msg.length).toBeGreaterThan(0);
      expect(item.ctx?.min).toBeTypeOf("number");
      expect(item.ctx?.max).toBeTypeOf("number");
    }
  });

  it("retorna 200 con CHI cuando los datos están dentro del rango permitido", async () => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archetype_id: "classic_feminine",
        tolerance_sd: 3,
        metrics: VALID_METRICS,
      }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      archetype_id: string;
      tolerance_sd: number;
      chi: number;
      sub_scores: Record<string, number>;
    };
    expect(json.ok).toBe(true);
    expect(json.archetype_id).toBe("classic_feminine");
    expect(json.tolerance_sd).toBe(3);
    expect(typeof json.chi).toBe("number");
    expect(Number.isFinite(json.chi)).toBe(true);
    expect(json.sub_scores).toBeTypeOf("object");
  });

  it("retorna 422 cuando archetype_id no existe en ARCHETYPES", async () => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archetype_id: "arquetipo_inexistente_xyz",
        tolerance_sd: 3,
        metrics: VALID_METRICS,
      }),
    });

    expect(res.status).toBe(422);
    const json = (await res.json()) as {
      detail: Array<{ loc: (string | number)[]; msg: string; type: string }>;
    };
    expect(Array.isArray(json.detail)).toBe(true);
    expect(json.detail).toHaveLength(1);
    const [item] = json.detail;
    expect(item.loc).toEqual(["body", "archetype_id"]);
    expect(item.type).toBe("enum");
    expect(item.msg.length).toBeGreaterThan(0);
  });

  it("retorna 422 cuando faltan campos requeridos dentro de metrics", async () => {
    const { body_fat_percent, leg_torso_ratio, ...partial } = VALID_METRICS;
    void body_fat_percent;
    void leg_torso_ratio;

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archetype_id: "classic_feminine",
        tolerance_sd: 3,
        metrics: partial,
      }),
    });

    expect(res.status).toBe(422);
    const json = (await res.json()) as {
      detail: Array<{ loc: (string | number)[]; msg: string; type: string }>;
    };
    expect(Array.isArray(json.detail)).toBe(true);

    const missing = json.detail.filter((d) => d.type === "missing");
    const fields = missing.map((d) => d.loc[d.loc.length - 1]);
    expect(fields).toContain("body_fat_percent");
    expect(fields).toContain("leg_torso_ratio");
    for (const item of missing) {
      expect(item.loc[0]).toBe("body");
      expect(item.loc[1]).toBe("metrics");
      expect(item.msg.length).toBeGreaterThan(0);
    }
  });

  it("ignora campos adicionales dentro de metrics y responde 200", async () => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archetype_id: "classic_feminine",
        tolerance_sd: 3,
        metrics: {
          ...VALID_METRICS,
          campo_inventado: 999,
          otro_extra: "texto",
        },
      }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      metrics: Record<string, unknown>;
    };
    expect(json.ok).toBe(true);
    expect(json.metrics).not.toHaveProperty("campo_inventado");
    expect(json.metrics).not.toHaveProperty("otro_extra");
    expect(Object.keys(json.metrics).sort()).toEqual(
      Object.keys(VALID_METRICS).sort(),
    );
  });

  it("en modo estricto (?strict=1) rechaza campos extra en metrics con 422", async () => {
    const res = await fetch(`${ENDPOINT}?strict=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archetype_id: "classic_feminine",
        tolerance_sd: 3,
        metrics: {
          ...VALID_METRICS,
          campo_inventado: 999,
          otro_extra: "texto",
        },
      }),
    });

    expect(res.status).toBe(422);
    const json = (await res.json()) as {
      detail: Array<{ loc: (string | number)[]; msg: string; type: string }>;
    };
    const extras = json.detail.filter((d) => d.type === "extra_forbidden");
    const fields = extras.map((d) => d.loc[d.loc.length - 1]);
    expect(fields).toContain("campo_inventado");
    expect(fields).toContain("otro_extra");
    for (const item of extras) {
      expect(item.loc[0]).toBe("body");
      expect(item.loc[1]).toBe("metrics");
      expect(item.msg.length).toBeGreaterThan(0);
    }
  });

  it("modo estricto vía body.strict=true también rechaza extras", async () => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archetype_id: "classic_feminine",
        tolerance_sd: 3,
        strict: true,
        metrics: { ...VALID_METRICS, foo: 1 },
      }),
    });
    expect(res.status).toBe(422);
    const json = (await res.json()) as {
      detail: Array<{ loc: (string | number)[]; type: string }>;
    };
    expect(
      json.detail.some(
        (d) => d.type === "extra_forbidden" && d.loc.includes("foo"),
      ),
    ).toBe(true);
  });
});
