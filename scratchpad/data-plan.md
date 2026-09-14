# Data gaps and risks plan

Status: items 1–5 complete. Item 2 collector and documentation are complete; a clean Fall release still requires the explicitly approved full recapture. Item 6 requires explicit approval.

1. **Make combination deterministic and bounded**
   - Select exactly the ten expected college/CPS artifacts plus the documented university-check artifacts.
   - Never treat a prior `*-all-schedules.json` output as an input, even when a new output path is supplied.
   - Add a regression test proving a pre-existing combined artifact cannot enter the input set.
   - Verify the regenerated payload matches the published payload except for `generated_at`.

2. **Bring new raw provenance into contract compliance** — collector/doc work complete
   - Include `pipeline_version` (current Git commit; otherwise explicit `unknown`) in future capture sidecars.
   - The existing Fall snapshot is marked legacy/incomplete; its historical raw captures remain unmodified. A release-quality provenance snapshot requires a future full recapture.

3. **Add a release-validation report** — complete
   - `combine_schedules.py` writes per-artifact and combined counts, location coverage, duplicate handling, and conflict counts to a sibling validation report.
   - It stops before publishing the combined artifact for checksum mismatches, missing expected collections, contract violations, schedule conflicts, or a threshold failure.
   - The current reviewed default unknown-location threshold is 10%; operators can set it with `--max-unknown-location-rate`.

4. **Prove source coverage** — complete
   - The combiner writes a collection manifest listing every selected college/CPS and university-check artifact, raw-capture count, and validation outcome.
   - The manifest's coverage statement limits the claim to all listed SIS selections at the snapshot; it explicitly makes no broader university-wide claim.

5. **Set a freshness policy** — complete
   - `docs/data-pipeline.md` defines weekly/daily refresh windows, manual SIS-change triggers, and the source-retrieval-completed timestamp as the sole freshness authority.
   - The data contract requires future consumers to show that timestamp and a display-time age, without representing snapshot data as live SIS availability.

6. **Commit a verified baseline**
   - Commit documentation, collector/tests, raw captures, generated artifacts, and validation evidence after the gates pass.
   - Record the combined artifact checksum in a tag or release note.

## Domain note

`DLR` denotes Distance Learning / Online. It is expected source data and must be classified as online, not treated as an anomalous physical room.
