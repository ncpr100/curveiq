# CurveIQ

Motor de puntuación de armonía corporal y planificación pre-quirúrgica. Permite capturar mediciones de un paciente, compararlas contra **arquetipos estéticos** y simular el efecto de procedimientos sobre el **Curve Harmony Index (CHI)**.

Construido sobre **TanStack Start** (React 19 + Vite 7) con **Tailwind CSS v4** y **shadcn/ui**.

---

## Características

- **Arquetipos estéticos**: 4 perfiles predefinidos (Femenino Clásico, Estética Atlética, Armonía Natural, Silueta Esculpida), cada uno con rangos ideales por métrica.
- **Validación de plausibilidad**: cada métrica se valida contra `[ideal − tolerance·SD, ideal + tolerance·SD]`. La tolerancia (en desviaciones estándar poblacionales) es configurable desde el formulario.
- **Endpoint de puntuación** (`POST /api/curveiq/score`):
  - Valida tipos, rangos y campos requeridos.
  - Devuelve errores estilo **FastAPI** (`status 422`, `{ detail: ValidationItem[] }`) que el formulario mapea campo a campo.
  - **Modo estricto** opcional (`?strict=1` o `body.strict: true`) que rechaza campos extra dentro de `metrics`.
  - En éxito devuelve `chi`, `sub_scores` y las métricas normalizadas.
- **Simulación de procedimientos**: lipoescultura, BBL, aumento mamario, marcación abdominal — cada uno aplica deltas calibrados a las métricas y recalcula el CHI.

---

## Stack

- **Framework**: TanStack Start v1 (SSR + server functions, target Cloudflare Workers)
- **Build**: Vite 7
- **UI**: React 19, Tailwind CSS v4, shadcn/ui (estilo `new-york`), lucide-react
- **Runtime**: Bun (gestor de paquetes y test runner vía `bunx vitest`)
- **Tests**: Vitest

---

## Empezar

```bash
bun install
bun run dev
```

Abrir `http://localhost:5173`.

### Tests

```bash
bunx vitest run
```

Los tests de integración cubren `POST /api/curveiq/score`:

- 200 con métricas en rango
- 422 con métricas fuera de tolerancia (mensajes por campo)
- 422 con `archetype_id` inexistente
- 422 con campos requeridos faltantes
- Comportamiento de campos extra (ignorados por defecto, rechazados en modo estricto vía query y vía body)

---

## Estructura

```
src/
  routes/
    __root.tsx              Shell raíz (head, layout)
    index.tsx               Página principal de CurveIQ
    api/curveiq/score.ts    Endpoint de puntuación
  components/curveiq/       MetricsForm, ScoreGauge, SilhouetteFigure
  lib/
    curveiq-data.ts         Arquetipos, métricas, SD poblacional, computeCHI
    curveiq-errors.ts       Parser de errores FastAPI → mensajes UI
tests/
  curveiq-score.integration.test.ts
```

---

## API: `POST /api/curveiq/score`

**Body**

```json
{
  "archetype_id": "classic_feminine",
  "tolerance_sd": 3,
  "strict": false,
  "metrics": {
    "waist_hip_ratio": 0.70,
    "waist_shoulder_ratio": 0.71,
    "bust_waist_ratio": 1.40,
    "shoulder_hip_ratio": 1.05,
    "body_fat_percent": 24,
    "leg_torso_ratio": 1.36,
    "gluteal_projection_cm": 7.5,
    "abdomen_muscle_visibility": 0.25
  }
}
```

**200 OK**

```json
{
  "ok": true,
  "archetype_id": "classic_feminine",
  "tolerance_sd": 3,
  "strict": false,
  "metrics": { "...": "..." },
  "chi": 92.4,
  "sub_scores": { "proportions": 95, "breast": 100, "contour": 88, "composition": 90 }
}
```

**422 Unprocessable Entity**

```json
{
  "detail": [
    {
      "loc": ["body", "metrics", "waist_hip_ratio"],
      "msg": "Fuera del rango permitido [0.5, 0.9]",
      "type": "value_error.number.not_in_range",
      "ctx": { "min": 0.5, "max": 0.9 }
    }
  ]
}
```

---

## Variables de entorno

Actualmente la app **no requiere secretos para funcionar en desarrollo** — el motor CurveIQ es puro cómputo determinístico sobre datos locales (`src/lib/curveiq-data.ts`) y el endpoint `/api/curveiq/score` no llama a servicios externos.

Las siguientes variables están **reservadas** para cuando se habiliten funcionalidades opcionales:

| Variable | Ámbito | Requerida | Descripción |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Cliente (build) | Solo si se activa Lovable Cloud | URL del proyecto Supabase. Inyectada por Vite. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cliente (build) | Solo si se activa Lovable Cloud | Anon/publishable key (segura para el bundle). |
| `SUPABASE_URL` | Servidor (runtime) | Solo si se activa Lovable Cloud | Misma URL, leída en server functions. |
| `SUPABASE_PUBLISHABLE_KEY` | Servidor (runtime) | Solo si se activa Lovable Cloud | Anon key en server functions. |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor (runtime) | Solo para operaciones admin | **Secreto.** Bypasea RLS — nunca exponer al cliente. |
| `CURVEIQ_STRICT_DEFAULT` | Servidor (runtime) | No | Si `"1"`, activa el modo estricto por defecto en `/api/curveiq/score` (aún no cableado; placeholder para futura activación global). |

**Convención**:
- `VITE_*` → embebidas en el bundle del cliente en build time. Solo valores públicos.
- `process.env.*` (sin prefijo `VITE_`) → solo runtime de servidor (server functions, server routes). Aquí van los secretos.

### Ejemplo `.env`

Crea un archivo `.env` en la raíz (ya está en `.gitignore`):

```dotenv
# === Lovable Cloud / Supabase (opcional) ===
# Descomenta y rellena solo si activas Lovable Cloud.
# VITE_SUPABASE_URL="https://your-project.supabase.co"
# VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOi..."
# SUPABASE_URL="https://your-project.supabase.co"
# SUPABASE_PUBLISHABLE_KEY="eyJhbGciOi..."

# === Solo servidor — NO commitear ===
# SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# === CurveIQ ===
# CURVEIQ_STRICT_DEFAULT="0"
```

> Los **build secrets** (tokens de registries privados de npm, etc.) se configuran en *Workspace Settings → Build Secrets* en Lovable, no en `.env`.

---

## Notas de despliegue

Target por defecto: Cloudflare Workers (ver `wrangler.jsonc`). Solo dependencias compatibles con el runtime de Workers (no Node nativo). Las variables `process.env.*` se inyectan en runtime — léelas dentro de `.handler()`, nunca en el scope del módulo.
