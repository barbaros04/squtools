# Repository architecture

SQU Tools has two independent delivery paths joined by a published data contract.

## Data path

`data/raw/` is evidence. Source collectors in `scripts/` acquire captures and write provenance. Normalizers publish selection artifacts into `data/processed/`; the combiner validates the bounded collection set and writes the current combined artifact, validation report, and collection manifest.

The timetable collector is one adapter, not the shape of all future sources. A future catalog, degree-requirement, or campus-location source must keep its source-specific acquisition/parsing details behind its own adapter, then publish a documented normalized artifact. Shared contracts live in `docs/data-contract.md`.

## Site path

The Solid application in `src/` is static. It reads published artifacts through `src/data/`, which is the only browser-facing data seam. Feature modules belong in `src/features/<tool>/`; a tool must not parse raw data, import collector code, or make source-network requests.

Initial feature modules:

- `schedule-builder/` — selects sections and computes conflict-free schedules.
- `empty-room-finder/` — evaluates known physical meetings only.
- `academic-plan/` — compares a student-entered plan with published course facts; requirements data remains a future source.

## Ownership rules

- **Collectors** own source protocol, raw evidence, and source-format parsing.
- **Contracts** own shared record meanings and compatibility decisions.
- **Published artifacts** own snapshot provenance, validation, and coverage statements.
- **Site data modules** own browser loading and snapshot-status display.
- **Feature modules** own user workflows, not data acquisition.

This structure keeps a source refresh or a new tool local: collectors can change without touching UI features, while tool work can proceed without altering source evidence.
