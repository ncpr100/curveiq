# PROJECT SOURCE OF TRUTH

## Purpose
This document defines the canonical structure, naming conventions, and implementation rules for CurveIQ.

## Canonical Structure
- Runtime source of truth is under `src/`.
- Route files live in `src/routes/`.
- CurveIQ domain data and error mapping live in `src/lib/`.
- CurveIQ feature components live in `src/components/curveiq/`.
- The endpoint contract for scoring is `POST /api/curveiq/score`.

## Compatibility Layer
The repository currently contains legacy root-level files (`index.tsx`, `score.ts`, `router.tsx`, `start.ts`, `server.ts`) as compatibility wrappers.

Current policy:
- Do not add new root-level app files.
- New app logic must be implemented in `src/` and only bridged from legacy files when required.
- Root-level duplicates are technical debt to be removed in a controlled migration.

Migration status:
- Route and API implementations are canonical in `src/routes/index.tsx` and `src/routes/api/curveiq/score.ts`.
- Root files `index.tsx` and `score.ts` are now wrappers that re-export the canonical src routes.
- Root files `router.tsx`, `start.ts`, and `server.ts` are wrappers that re-export canonical src entries.

## Naming and Style
- Keep file names kebab-case or existing project pattern.
- Keep route exports as explicit constants (`export const Route = ...`).
- Keep FastAPI-style validation error schema for 422 responses.
- Reuse existing UI primitives and design tokens. No new UI framework.

## API Contract Rules
- Single scoring mode returns: `ok`, `mode`, `model_version`, `archetype_id`, `tolerance_sd`, `strict`, `metrics`, `chi`, `sub_scores`, `explanations`, `risk_flags`.
- Batch/recommend mode accepts `scenarios[]` and returns ranked scenario outputs with `recommendation`.
- Validation semantics remain identical for required fields, numeric checks, strict mode, and plausibility bounds.

## Testing Rules
- Every API contract change requires integration coverage in `curveiq-score.integration.test.ts`.
- Build (`npm run build`) and integration test pass are required before commit.

## Duplicate/Conflict Watchlist
- `README (1).md`
- `breadcrumb (1).tsx`
- `utils (1).ts`
- Root-level wrappers remain intentionally for compatibility; do not duplicate logic into root files
