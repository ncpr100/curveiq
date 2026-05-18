# Next Steps Execution Folder

This folder is the single execution source for all pending improvements.

## Goal
Drive CurveIQ to completion using a strict, phase-based roadmap with acceptance gates.

## Files
- ROADMAP-MASTER.md: ordered phases, milestones, dependencies, and Definition of Done.
- IMPROVEMENTS-BACKLOG.md: full list of improvements with status checkboxes.

## Execution Rules
1. Follow phases in order unless a task is explicitly marked parallel.
2. Do not skip acceptance criteria.
3. Every completed task must include proof:
- code reference
- test/build result
- risk note
4. Update task status in IMPROVEMENTS-BACKLOG.md immediately after completion.
5. Blocker protocol:
- mark task as BLOCKED
- add root cause
- add unblocking action owner and due date

## Status Model
- TODO
- IN_PROGRESS
- BLOCKED
- DONE

## Completion Rule
Project is complete only when:
1. All P0-P4 phases in ROADMAP-MASTER.md are DONE.
2. All items in IMPROVEMENTS-BACKLOG.md are DONE.
3. Final verification gate is passed:
- build green
- integration tests green
- live UI sanity check green
- architecture and docs updated
