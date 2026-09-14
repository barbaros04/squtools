# Data layout

This directory is the data seam between acquisition and the static site. Website features consume only published artifacts; collectors own raw source captures and normalization.

```text
data/
├── raw/<source>/snapshots/<retrieval-run>/  immutable captures and sidecars
├── raw/<source>/legacy/<date>/              retained historic evidence; never republished
└── processed/                               current normalized artifacts, manifests, and validation reports
```

## Published timetable snapshot

`processed/2026-2027-fall-all-schedules.json` is the current combined timetable artifact. Its sibling `*-validation.json` is the release gate output, `*-collection-manifest.json` bounds its source coverage, and `*-snapshot-status.json` is the compact browser-facing freshness/counts artifact. Read the combined artifact's `snapshot.source_retrieval_completed_at` for freshness; `generated_at` only records transformation time.

## Adding a source or data family

Each new official public source gets its own collector/adapter and `raw/<source>/` namespace. It must preserve immutable captures, provenance sidecars, source-specific validation, and a normalized artifact. New cross-source fields require a data-contract update and a schema-version decision before consumers use them.

Never edit raw captures or processed artifacts by hand.
