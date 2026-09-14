# SQU Tools

A fast, static collection of utility tools for Sultan Qaboos University (SQU) students.

## Planned tools

- **Schedule Builder:** choose courses and generate conflict-free timetable combinations, sortable by gaps, start/finish time, and preferred days.
- **Empty Room Finder:** find rooms without scheduled classes by day, time, and building.

## Architecture

SQU Tools will run entirely on GitHub Pages. A Python pipeline gathers and validates public timetable/course data, produces compressed JSON artifacts, and the Solid + TypeScript frontend queries them locally. There is no runtime backend.

## Current milestone: data gathering

Before building the app, we need a reproducible and auditable data pipeline:

1. Identify authoritative public SQU timetable and course sources.
2. Capture raw source data with provenance.
3. Normalize courses, sections, meetings, rooms, and terms into one contract.
4. Validate data quality and publish compressed static artifacts.
5. Automate refreshes with GitHub Actions after the manual pipeline is trustworthy.

See [the data pipeline plan](docs/data-pipeline.md) and [data contract](docs/data-contract.md).

## Planned stack

| Layer | Choice |
| --- | --- |
| Frontend | Solid 2 + TypeScript |
| Build | Vite |
| Styling | Plain CSS |
| Data prep | Python |
| App data | Compressed JSON |
| Local state | localStorage / IndexedDB |
| Hosting | GitHub Pages |
| Updates | GitHub Actions |

## Local schedule collector

Create a local environment and install the collector dependencies:

```sh
python -m venv .venv
.venv/Scripts/pip install -r scripts/requirements.txt
```

Validate SIS selections without generating a report:

```sh
.venv/Scripts/python scripts/scrape_schedule.py --year 2026/2027 --semester Fall --college "College of Arts and Social Sciences" --no-preview
```

Omit `--no-preview` to request the session-bound report viewer. The collector saves untouched responses plus provenance to a selection-specific directory in `data/raw/sis/` and validates/normalizes the schedule into a selection-specific JSON file in `data/processed/`. Existing artifacts are protected; use `--overwrite` only when intentionally refreshing that selection. English is the default report language; use `--language arabic` when needed. See `scripts/scrape_schedule.py --help` for filters and output paths.

Combine the selected Fall artifacts only after collection succeeds. This writes the combined dataset, a sibling validation report, and a collection manifest; it refuses publication on checksum, contract, coverage, conflict, or unknown-location-rate failures. The manifest states the bounded SIS selections covered by that snapshot; it does not imply broader coverage.

```sh
.venv/Scripts/python scripts/combine_schedules.py --term 2026-2027-fall
```

The default unknown-location threshold is 10%; pass `--max-unknown-location-rate` to set a reviewed release threshold.

## Development

The static site uses Solid 2, TypeScript, and Vite:

```sh
npm install
npm run dev
npm run build
```

See [`docs/repository-architecture.md`](docs/repository-architecture.md) for ownership boundaries and [`data/README.md`](data/README.md) for data layout.

## Repository status

The local collector and combined-artifact validation produce a draft normalized dataset. The site shell is ready for isolated tool modules; Schedule Builder is the next implementation target. Compression and final data-contract review remain to be implemented.
