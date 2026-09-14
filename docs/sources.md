# Source inventory

## SQU Courses Schedule

| Field | Detail |
| --- | --- |
| Name / owner | SQU Student Information System (SIS) |
| URL | <https://sis.squ.edu.om/SQU_CoursesSchedule.aspx> |
| Access | Public ASP.NET Web Forms page; no login observed during initial investigation |
| Intended coverage | Course offerings and their timetable report for a selected academic year/semester/college |
| Observed retrieval | 2026-09-14 10:33–10:40 UTC; a complete Fall 2026/2027 collection is retained with raw captures, checksums, and collector Git revision |
| Terms / constraints | Must be reviewed before automated collection; scraper must use a polite, bounded request rate and must not bypass access controls |

## Observed interface

The page provides these controls:

- Study level: **All**, **UG**, or **PG**.
- Academic year (the observed list spans 1979/1980–2030/2031).
- Semester: **Fall**, **Spring**, **Summer**, or **Phase3**.
- College and a dependent Department selector.
- Course Code text filter.
- Report language: **Arabic** or **English**.
- Optional filters: **Ramadan Timings**, **University Elective Courses**, and **University Requirements**.
- **Preview** submits the selected report.

Changing College is an ASP.NET asynchronous postback that repopulates Department. The report itself is not a JSON API: submitting Preview posts the Web Forms state and the server responds with script that opens `/umisreports/viewers/localreportviewer.aspx` in a new tab. The report viewer is session-dependent.

The viewer can split a report across multiple HTML pages. Its Next control must be invoked with an ASP.NET `__EVENTTARGET` for the parent ReportViewer control (not image-button coordinates); the final navigation request returns a non-data viewer shell. The collector retains only data-bearing pages and fails if the first viewer response has no schedule table.

## Implementation decision

Use **Python** for the local collector. It is the smallest fit for a data pipeline and gives us straightforward HTML/report parsing, retries, validation, and JSON generation without a browser runtime.

The production collector should use `requests.Session` (cookies must persist from the selection POST through the report-viewer request), parse the Web Forms hidden fields on every request, and reproduce only observed form submissions. Browser automation is useful once for discovery, but must not be a dependency of the recurring scrape.

Proposed narrow stages:

1. `fetch_form()` — GET the schedule page and parse controls, selected option values, and hidden state.
2. `set_college()` — POST the documented College postback only when a department-specific query is needed.
3. `request_report()` — POST Preview with the chosen filters, preserving the same session.
4. `fetch_report()` — request the viewer in that session, follow every data-bearing ReportViewer page, and use explicit connect/read timeouts. GET requests have bounded retry/backoff; state-changing form posts are not retried automatically.
5. `parse_report()` — extract source fields to an intermediate record; retain the raw response and provenance before normalization.

Do not attempt high-concurrency requests. Start at one report at a time, cache completed raw captures by checksum, and measure report size/latency before choosing any bounded concurrency.

## Open questions before implementation

- Confirm the site terms/robots guidance and a safe collection cadence.
- Obtain a successful small report and identify its actual output format, fields, pagination, and report-viewer follow-up requests.
- Determine whether college/department report partitions are required to avoid timeouts and whether they cover university-wide courses without duplicates.
- Map source labels and room/time formats to the draft data contract; document TBA, online, and missing-location behavior.
