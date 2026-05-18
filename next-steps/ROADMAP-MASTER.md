# CurveIQ Roadmap Master

Last update: 2026-05-18
Owner: Product + Engineering

## Phase P0 - Foundation Integrity (must finish first)
Status: TODO

Objectives:
- eliminate architectural ambiguity
- enforce src as canonical runtime source
- stabilize styling and route loading

Tasks:
1. Confirm root wrapper policy and keep root files as wrappers only.
2. Remove duplicated business logic from root-level files (already mostly completed).
3. Validate Tailwind source scanning strategy against canonical locations.
4. Validate route generation and runtime startup consistency.

Acceptance Gate:
- npm run build passes
- API integration tests pass
- no root file contains duplicated app logic

## Phase P1 - Product Core Reliability
Status: TODO

Objectives:
- strengthen scoring engine reliability and API behavior
- make error handling and validation deterministic

Tasks:
1. Add test coverage for edge cases in batch recommendation mode.
2. Add schema-level validation guardrails for scenarios payload size limits.
3. Add request id/idempotency support for repeated scoring calls.
4. Add response time and failure telemetry for score endpoint.

Acceptance Gate:
- integration suite expanded and green
- no regressions on single mode
- API latency baseline documented

## Phase P2 - Premium UX and Conversion Readiness
Status: TODO

Objectives:
- complete premium visual and conversion experience
- support high-value clinic sales flow

Tasks:
1. Implement premium conversion landing sections (ROI, trust, CTA).
2. Finalize guided clinical flow states and edge cases.
3. Improve scenario compare UX with recommendation clarity.
4. Add accessibility pass (focus states, contrast, keyboard flow).

Acceptance Gate:
- desktop and mobile sanity pass complete
- a11y quick audit complete
- conversion CTAs instrumented

## Phase P3 - Operations, Analytics, and Sales Enablement
Status: TODO

Objectives:
- make funnel measurable and operationally usable
- support enterprise demos and onboarding

Tasks:
1. Implement event tracking: click_demo, save_scenario, compare_viewed, cta_diagnostico.
2. Add KPI dashboard data foundations.
3. Finalize sales demo script and onboarding checklist integration.
4. Add pilot launch runbook and owner matrix.

Acceptance Gate:
- funnel metrics visible end-to-end
- sales script aligned to product flow
- onboarding checklist tested in live demo flow

## Phase P4 - Cleanup and Final Hardening
Status: TODO

Objectives:
- remove repository noise and unresolved duplicate artifacts
- finalize documentation and handoff

Tasks:
1. Resolve duplicate naming artifacts:
- README (1).md
- breadcrumb (1).tsx
- utils (1).ts
2. Finalize source-of-truth and changelog updates.
3. Run full regression validation and release candidate checklist.

Acceptance Gate:
- duplicates resolved
- docs up to date
- build/tests/live sanity green

## Final Definition of Done
All phases P0-P4 are DONE and each acceptance gate is passed with evidence.