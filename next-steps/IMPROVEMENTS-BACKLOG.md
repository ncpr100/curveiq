# Improvements Backlog

Status key: TODO | IN_PROGRESS | BLOCKED | DONE

## A. Architecture and Codebase Hygiene
- [ ] (TODO) Keep root wrappers thin only: index.tsx, score.ts, router.tsx, start.ts, server.ts.
- [ ] (TODO) Remove logic drift risk between root wrappers and src canonical modules.
- [ ] (TODO) Validate routeTree generation after each route-level refactor.
- [ ] (TODO) Resolve duplicate file naming artifacts:
  - README (1).md
  - breadcrumb (1).tsx
  - utils (1).ts

## B. API and Backend Reliability
- [ ] (TODO) Add scenario payload limits and deterministic validation errors.
- [ ] (TODO) Add request idempotency support for repeated recommendation calls.
- [ ] (TODO) Add endpoint telemetry fields for latency/failure tracking.
- [ ] (TODO) Add stronger tests for recommendation tie-break behavior.
- [ ] (TODO) Add tests for malformed scenarios arrays and large payload behavior.

## C. Frontend UX and Premium Conversion
- [ ] (TODO) Add premium conversion blocks (trust, ROI, CTA focus) in product-facing flow.
- [ ] (TODO) Polish guided flow states for full decision cycle (Measure/Simulate/Decide).
- [ ] (TODO) Improve scenario compare readability for executive/clinic users.
- [ ] (TODO) Add keyboard accessibility and focus management pass.
- [ ] (TODO) Perform mobile layout refinement pass for critical screens.

## D. Analytics and Operations
- [ ] (TODO) Implement and verify conversion funnel events.
- [ ] (TODO) Build KPI aggregation layer for business dashboard.
- [ ] (TODO) Define pilot success metrics and weekly review routine.
- [ ] (TODO) Add launch readiness checklist used by Product/Sales/Engineering.

## E. Quality and Validation Gates
- [ ] (TODO) Build must pass on every milestone.
- [ ] (TODO) Integration tests must pass on every milestone.
- [ ] (TODO) Live UI sanity check must pass on every milestone.
- [ ] (TODO) Update PROJECT_SOURCE_OF_TRUTH.md for structural changes.
- [ ] (TODO) Update CHANGELOG.md for significant delivered changes.

## Current Critical Path (follow in order)
1. A-Architecture baseline complete
2. B-API reliability complete
3. C-UX conversion readiness complete
4. D-analytics operational readiness complete
5. E-final hardening and release gate complete

## Completion Checklist
- [ ] All backlog items moved to DONE
- [ ] No BLOCKED items remaining
- [ ] Final validation evidence attached
- [ ] Project marked COMPLETE
