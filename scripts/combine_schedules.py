#!/usr/bin/env python3
"""Verify and combine per-college SQU schedule artifacts for one term."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

EXPECTED_COLLEGES = {
    "college-of-arts-and-social-sciences", "college-of-agricultural-and-marine-sciences",
    "college-of-economics-and-political-science", "college-of-education", "college-of-engineering",
    "college-of-law", "college-of-nursing", "college-of-medicine-and-health-sciences",
    "college-of-science", "center-for-preparatory-studies",
}
EXPECTED_UNIVERSITY_REPORTS = {"university-electives", "university-requirements"}


def meeting_key(course_id: str, section: dict, meeting: dict) -> tuple:
    return (course_id, section["section_code"], meeting["type"], tuple(meeting["days"]), meeting["start_time"], meeting["end_time"], meeting["building"], meeting["room"])


def audit_dataset(path: Path, data: dict) -> tuple[dict, list[str]]:
    errors: list[str] = []
    courses = data.get("courses", [])
    sections = [section for course in courses for section in course.get("sections", [])]
    meetings = [meeting for section in sections for meeting in section.get("meetings", [])]
    for label, records, identifier in (("course", courses, "course_id"), ("section", sections, "section_id"), ("meeting", meetings, "meeting_id")):
        identifiers = [record.get(identifier) for record in records]
        if any(not value for value in identifiers) or len(identifiers) != len(set(identifiers)):
            errors.append(f"{path.name}: invalid or duplicate {label} IDs")
    for section in sections:
        expected_status = "scheduled" if section.get("meetings") else "unknown"
        if section.get("meeting_status") != expected_status:
            errors.append(f"{path.name}: invalid meeting status")
            break
    for meeting in meetings:
        if (not meeting.get("days") or any(day not in {"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"} for day in meeting["days"]) or
                not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", meeting.get("start_time", "")) or
                not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", meeting.get("end_time", "")) or
                meeting["start_time"] >= meeting["end_time"]):
            errors.append(f"{path.name}: invalid meeting time or day")
            break
        if meeting.get("location_status") == "known" and (not meeting.get("building") or not meeting.get("room")):
            errors.append(f"{path.name}: known meeting location lacks building or room")
            break
    for capture in data.get("source", {}).get("captures", []):
        capture_path = Path(capture["path"])
        metadata_path = capture_path.with_suffix(capture_path.suffix + ".metadata.json")
        if not capture_path.exists() or not metadata_path.exists():
            errors.append(f"{path.name}: missing raw capture or provenance sidecar: {capture_path}")
            continue
        actual_sha256 = hashlib.sha256(capture_path.read_bytes()).hexdigest()
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        if actual_sha256 != capture.get("sha256") or actual_sha256 != metadata.get("content_sha256"):
            errors.append(f"{path.name}: raw capture checksum mismatch: {capture_path}")
    known_locations = sum(meeting.get("location_status") == "known" for meeting in meetings)
    return {
        "artifact": path.name,
        "courses": len(courses), "sections": len(sections), "meetings": len(meetings),
        "unscheduled_sections": sum(section.get("meeting_status") == "unknown" for section in sections),
        "known_locations": known_locations, "unknown_locations": len(meetings) - known_locations,
        "duplicate_source_rows": data.get("record_counts", {}).get("duplicate_source_rows", 0),
        "collapsed_co_taught_rows": data.get("record_counts", {}).get("collapsed_co_taught_rows", 0),
        "conflicts": 0,
    }, errors


def selected_datasets(all_datasets: list[tuple[Path, dict]]) -> list[tuple[Path, dict]]:
    college_datasets = []
    for college in sorted(EXPECTED_COLLEGES):
        matches = [(path, data) for path, data in all_datasets if college in path.name]
        if len(matches) != 1:
            raise SystemExit(f"expected exactly one artifact for {college}; found {len(matches)}")
        college_datasets.extend(matches)
    university_datasets = []
    for report in sorted(EXPECTED_UNIVERSITY_REPORTS):
        matches = [(path, data) for path, data in all_datasets if "-university-" in path.name and path.name.endswith(f"-{report}.json")]
        if len(matches) != 1:
            raise SystemExit(f"expected exactly one university artifact for {report}; found {len(matches)}")
        university_datasets.extend(matches)
    return college_datasets + university_datasets


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--term", required=True, help="Term prefix, e.g. 2026-2027-fall")
    parser.add_argument("--input", type=Path, default=Path("data/processed"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--validation-report", type=Path, help="Validation report destination (default: beside output)")
    parser.add_argument("--max-unknown-location-rate", type=float, default=0.10, help="Maximum allowed unknown-location meeting rate (default: 0.10)")
    args = parser.parse_args()
    if not 0 <= args.max_unknown_location_rate <= 1:
        raise SystemExit("--max-unknown-location-rate must be between 0 and 1")

    output = args.output or args.input / f"{args.term}-all-schedules.json"
    files = sorted(path for path in args.input.glob(f"{args.term}-*.json") if path != output)
    all_datasets = [(path, json.loads(path.read_text(encoding="utf-8"))) for path in files]
    datasets = selected_datasets(all_datasets)
    college_datasets = [(path, data) for path, data in datasets if "-university-" not in path.name]

    courses: dict[str, dict] = {}
    section_signatures: dict[tuple[str, str], tuple] = {}
    college_meetings: set[tuple] = set()
    for path, data in college_datasets:
        for course in data["courses"]:
            target = courses.setdefault(course["course_id"], {"course_id": course["course_id"], "title": course["title"], "sections": []})
            if target["title"] != course["title"]:
                raise SystemExit(f"conflicting titles for {course['course_id']}")
            for section in course["sections"]:
                key = (course["course_id"], section["section_code"])
                signature = tuple(meeting_key(course["course_id"], section, meeting) for meeting in section["meetings"])
                if key in section_signatures:
                    if section_signatures[key] != signature:
                        raise SystemExit(f"conflicting section schedule for {key}")
                    continue
                section_signatures[key] = signature
                target["sections"].append(section)
                college_meetings.update(signature)

    university_checks = []
    for path, data in datasets:
        if "-university-" not in path.name:
            continue
        source_meetings = {meeting_key(course["course_id"], section, meeting) for course in data["courses"] for section in course["sections"] for meeting in section["meetings"]}
        missing_meetings = source_meetings - college_meetings
        if missing_meetings:
            raise SystemExit(f"University artifact has {len(missing_meetings)} meetings absent from college artifacts: {path.name}")
        university_checks.append({"artifact": path.name, "meetings": len(source_meetings), "all_present_in_college_artifacts": True})

    validation_artifacts = []
    validation_errors = []
    for path, data in datasets:
        report, errors = audit_dataset(path, data)
        validation_artifacts.append(report)
        validation_errors.extend(errors)

    artifact_snapshots = []
    retrieval_times = []
    for path, data in datasets:
        captures = []
        for capture in data.get("source", {}).get("captures", []):
            metadata_path = Path(capture["path"] + ".metadata.json")
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            captures.append({"path": capture["path"], "sha256": capture["sha256"], "retrieved_at": metadata["retrieved_at"]})
            retrieval_times.append(metadata["retrieved_at"])
        artifact_snapshots.append({"artifact": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "captures": captures})
    snapshot_id = hashlib.sha256(json.dumps(artifact_snapshots, sort_keys=True).encode()).hexdigest()

    combined_known_locations = sum(meeting["location_status"] == "known" for course in courses.values() for section in course["sections"] for meeting in section["meetings"])
    combined_meetings = len(college_meetings)
    unknown_location_rate = (combined_meetings - combined_known_locations) / combined_meetings if combined_meetings else 0
    if unknown_location_rate > args.max_unknown_location_rate:
        validation_errors.append(f"combined unknown-location rate {unknown_location_rate:.4f} exceeds {args.max_unknown_location_rate:.4f}")
    validation_report = {
        "generator": "scripts/combine_schedules.py",
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "term": college_datasets[0][1]["term"],
        "max_unknown_location_rate": args.max_unknown_location_rate,
        "artifacts": validation_artifacts,
        "combined": {"courses": len(courses), "sections": len(section_signatures), "meetings": combined_meetings, "known_locations": combined_known_locations, "unknown_locations": combined_meetings - combined_known_locations, "unknown_location_rate": unknown_location_rate, "conflicts": 0},
        "errors": validation_errors,
    }
    validation_path = args.validation_report or output.with_name(f"{output.stem}-validation.json")
    validation_path.write_text(json.dumps(validation_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if validation_errors:
        raise SystemExit(f"validation failed; see {validation_path}")

    collection_manifest = {
        "generator": "scripts/combine_schedules.py",
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "term": college_datasets[0][1]["term"],
        "coverage_statement": "All selections in this manifest were validated from the SIS collection inventory at the stated snapshot; no broader university-wide coverage is implied.",
        "collections": [
            {
                "collection_id": next((college for college in EXPECTED_COLLEGES if college in path.name), next((report for report in EXPECTED_UNIVERSITY_REPORTS if report in path.name), "unknown")),
                "scope": "college_or_cps" if "-university-" not in path.name else "university_check",
                "artifact": path.name,
                "raw_capture_count": len(data.get("source", {}).get("captures", [])),
                "outcome": "validated",
            }
            for path, data in datasets
        ],
    }
    manifest_path = output.with_name(f"{args.term}-collection-manifest.json")
    manifest_path.write_text(json.dumps(collection_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    payload = {
        "schema_version": 1,
        "generator": "scripts/combine_schedules.py",
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "term": college_datasets[0][1]["term"],
        "snapshot": {"snapshot_id": snapshot_id, "source_retrieval_started_at": min(retrieval_times), "source_retrieval_completed_at": max(retrieval_times), "artifacts": artifact_snapshots},
        "coverage": {"expected_colleges": sorted(EXPECTED_COLLEGES), "college_artifacts": [path.name for path, _ in college_datasets], "university_checks": university_checks},
        "record_counts": {"courses": len(courses), "sections": len(section_signatures), "meetings": len(college_meetings)},
        "courses": list(courses.values()),
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified all 10 college/CPS artifacts; wrote {payload['record_counts']['courses']} courses, {payload['record_counts']['sections']} sections, and {payload['record_counts']['meetings']} meetings to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
