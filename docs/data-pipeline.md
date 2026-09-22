# Data gathering pipeline

## Goal

Produce a trustworthy, static dataset that supports both timetable generation and room availability queries for a defined SQU academic term.

## Scope of the first iteration

- One academic term at a time.
- Publicly accessible official SQU course and timetable sources only.
- Course, section, meeting time, building, and room data needed by the two initial tools.
- A manually runnable Python pipeline before scheduling it in GitHub Actions.

Out of scope: registration, live occupancy, individual student schedules, notifications, and scraping sources that require bypassing access controls.

## Pipeline stages

1. **Source inventory** — document each candidate source, ownership, URL, term coverage, access method, update cadence, and known gaps. For each collection run, retain a generated manifest of the exact SIS selections intended and their outcomes; make no broader coverage claim.
2. **Acquire** — save an immutable raw capture and a sidecar provenance record.
3. **Parse** — convert each source format to structured intermediate records without silently dropping invalid rows.
4. **Normalize** — emit the shared records in [`data-contract.md`](data-contract.md).
5. **Validate** — reject malformed meeting times, missing identifiers, invalid day values, duplicate sections, and conflicting meetings.
6. **Publish** — write versioned JSON plus a compact browser artifact, validation report, and manifest to `data/processed/`. Publication must stop if capture checksums, expected collection coverage, contract invariants, schedule conflicts, or the reviewed unknown-location threshold fail.
7. **Review** — inspect validation output and a small source-to-output sample before release.

## Source inventory template

Create `docs/sources.md` once sources are investigated. For every source, capture:

| Field | Required detail |
| --- | --- |
| Name / owner | Official SQU unit or system |
| URL | Canonical public URL |
| Coverage | Term, campus, colleges, and records covered |
| Access | Public page, file download, or other permitted method |
| Refresh signal | Published date, timetable revision, or observed cadence |
| Fields | Available identifiers and schedule/location fields |
| Constraints | Terms of use, rate limits, robots guidance, auth requirement |
| Gaps | Missing rooms, TBA times, cross-listed courses, etc. |

## Raw capture and provenance

For each fetch, retain the untouched response in `data/raw/` (or external release storage if it becomes too large) plus metadata containing:

```json
{
  "source_url": "https://…",
  "retrieved_at": "ISO-8601 UTC",
  "term": "YYYY-TERM",
  "content_sha256": "…",
  "content_type": "…",
  "pipeline_version": "git commit"
}
```

Raw inputs and processed outputs are generated; do not hand-edit them. New collector captures record the Git `HEAD` as `pipeline_version`; when no Git revision is available, they record `"unknown"` explicitly.

The existing Fall 2026/2027 captures predate this field and are therefore **legacy provenance**. They remain checksum-verifiable evidence, but are not provenance-complete for a release. Do not edit their sidecars; a provenance-complete Fall release requires recapturing every selected report with the current collector.

## Freshness policy

The snapshot's `source_retrieval_completed_at` is the authoritative freshness timestamp. A generated timestamp only says when SQU Tools transformed the captures; it does not prove the SIS data was current.

- Before SIS publishes a term timetable, do not publish a schedule-coverage claim for that term.
- From first publication until four weeks before the term starts, refresh at least weekly.
- During the final four weeks before the term and through the SIS add/drop period, refresh daily.
- After add/drop, refresh at least weekly while the term remains supported.
- Trigger a manual refresh immediately when SIS shows a timetable revision, a source-selector/report-format change, a collector validation failure, or a credible report of a changed section.
- The release threshold must be reviewed against the location-status breakdown, not raised silently. The Fall 2026/2027 refresh on 2026-09-22 uses a 12% threshold: its 11.49% unknown locations are exclusively SIS's `Closed section`/`CLO`, `Faculty Room`/`FRM`, `Field`/`FLD`, and `No Room Available`/`NOR` markers, which remain explicitly excluded from room availability.

Every consumer must show the snapshot retrieval-completed timestamp and its age calculated at display time. Consumers must describe data as a snapshot, not as live SIS availability; stale or unavailable snapshot metadata must be visible rather than replaced with an inferred current value.

## Automation path

Start with a local command that accepts a source/term and writes a validation report. Only then add a GitHub Actions workflow with manual dispatch first, followed by a schedule if source refresh behavior is understood. The workflow should commit or release data only when validation passes and the resulting dataset changes.

## Completion criteria for this milestone

- At least one official source is documented and its permitted access method confirmed.
- A sample term can be acquired repeatably with provenance.
- Normalized sample records meet the contract and validation rules.
- Known missing or ambiguous fields are visible in a validation report.
