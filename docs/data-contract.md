# Data contract (draft)

This contract is intentionally small. It represents published timetable facts, not registration or student-specific data. All records are scoped to one `term_id`.

## Identifiers

- `term_id`: stable term key, e.g. `2025-FALL`; exact convention to be decided after source discovery.
- `course_id`: catalog course identifier, e.g. subject + catalog number.
- `section_id`: source-stable identifier for an offered section. If unavailable, derive it deterministically and record the method.
- `meeting_id`: deterministic identifier for one day/time/location occurrence.

## Normalized records

```json
{
  "schema_version": 1,
  "term": {
    "term_id": "2025-FALL",
    "label": "Fall 2025",
    "timezone": "Asia/Muscat"
  },
  "courses": [
    {
      "course_id": "COMP-XXXX",
      "subject": "COMP",
      "catalog_number": "XXXX",
      "title": "Course title",
      "sections": [
        {
          "section_id": "source-stable-id",
          "section_code": "01",
          "instructors": ["Name"],
          "meeting_status": "scheduled",
          "meetings": [
            {
              "meeting_id": "deterministic-id",
              "days": ["SUN", "TUE"],
              "start_time": "08:00",
              "end_time": "09:20",
              "building": "Building name or code",
              "room": "Room identifier",
              "location_status": "known"
            }
          ]
        }
      ]
    }
  ]
}
```

`instructors`, `building`, and `room` may be `null`/empty only when the source does not provide them. `location_status` must explain whether a location is `known`, `tba`, `online`, or `unknown`.

## Validation invariants

- IDs are non-empty and unique within their scopes.
- Each meeting has at least one valid day: `SUN` through `SAT`.
- Times use 24-hour `HH:MM`, with `start_time < end_time`.
- A section with no meetings is retained with `meeting_status: "unknown"`; it must not appear as an available room booking.
- Rooms are compared using a canonical building and room key while retaining the source display values.
- Duplicate source rows collapse only when all timetable-relevant fields agree; otherwise report a conflict.
- Dataset manifest includes schema version, term, source provenance references, record counts, checksum, and generation timestamp.
- A combined artifact includes a `snapshot` with a deterministic `snapshot_id`, source-retrieval start/end timestamps, and the checksum/provenance of every input artifact. Consumers can compare this snapshot to detect stale data without inspecting course records.
- Consumers must expose `snapshot.source_retrieval_completed_at` and a display-time age. They must present the dataset as a snapshot rather than live SIS availability, and visibly retain unavailable/stale snapshot metadata instead of inferring currentness.

## Consumer expectations

- Schedule Builder treats meetings in the same section as required together and rejects overlapping meetings across selected sections.
- Empty Room Finder considers a room occupied only for meetings with a known physical building and room, on matching day and overlapping time.
- Consumers must handle absent instructor and location fields without treating unknown as free.

Any contract change requires a schema-version decision and update to the pipeline documentation.
