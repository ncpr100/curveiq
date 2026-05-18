# CHANGELOG

## 2026-05-18

### Added
- Added project governance baseline in `PROJECT_SOURCE_OF_TRUTH.md`.
- Extended `POST /api/curveiq/score` with:
  - Single-mode explainability fields (`mode`, `model_version`, `explanations`, `risk_flags`).
  - Batch/recommend evaluation support via `scenarios[]` and ranked recommendations.
- Added integration tests for new response metadata and batch recommendation flow.
- Added guided clinical workflow strip and scenario comparison UX in dashboard.

### Notes
- Existing root-level and `src/` bridge duplication remains and is now documented as technical debt.

### Fixed
- Fixed Tailwind utility generation by correcting source scan paths in `styles.css` (`@source ./src`, `@source ./*.ts`, `@source ./*.tsx`) so root-bridge UI files are included and premium layout classes render correctly.

### Changed
- Completed non-destructive migration phase for route duplication:
  - Canonicalized implementations in `src/routes/index.tsx` and `src/routes/api/curveiq/score.ts`.
  - Converted root files `index.tsx` and `score.ts` into compatibility wrappers that re-export canonical src routes.
- Completed non-destructive migration phase for runtime entry duplication:
  - Converted root files `router.tsx`, `start.ts`, and `server.ts` into compatibility wrappers that re-export canonical src entries.

### Added
- Added execution control folder `next-steps/` with mandatory planning and completion artifacts:
  - `next-steps/README.md`
  - `next-steps/ROADMAP-MASTER.md`
  - `next-steps/IMPROVEMENTS-BACKLOG.md`
