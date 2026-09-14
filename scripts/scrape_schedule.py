#!/usr/bin/env python3
"""Fetch, validate, and normalize one public SQU course-schedule report."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Final

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

FORM_URL: Final = "https://sis.squ.edu.om/SQU_CoursesSchedule.aspx"
REPORT_URL: Final = "https://sis.squ.edu.om/umisreports/viewers/localreportviewer.aspx"
TIMEOUT: Final = (20, 180)  # connect, read seconds; report generation is server-side.
MIN_REQUEST_INTERVAL: Final = 1.0
USER_AGENT: Final = "squtools-data-collector/0.2 (local research; contact: repository owner)"
DAYS: Final = {"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"}
UNKNOWN_LOCATION_MARKERS: Final = {"", "nor", "clo", "fld", "frm", "no room available", "closed section", "field", "faculty room"}

NAMES: Final = {
    "level": "ctl00$cntphmaster$rdbClass",
    "year": "ctl00$cntphmaster$drpAcadYear",
    "semester": "ctl00$cntphmaster$drpSemester",
    "college": "ctl00$cntphmaster$drpFaculty",
    "department": "ctl00$cntphmaster$drpDept",
    "course_code": "ctl00$cntphmaster$txtCourseCode",
    "language": "ctl00$cntphmaster$rdbLang",
    "ramadan": "ctl00$cntphmaster$chkRamTime",
    "university_electives": "ctl00$cntphmaster$chbElecUniv",
    "university_requirements": "ctl00$cntphmaster$chkUnivReq",
    "preview": "ctl00$cntphmaster$btnPrint",
}
LEVELS: Final = {"all": "0", "ug": "1", "pg": "2"}
LANGUAGES: Final = {"english": "1", "arabic": "2"}
REPORT_COLUMNS: Final = (
    "college", "course_code", "credit_hours", "section_code", "course_title",
    "section_type", "department", "instructor", "enrolled", "max_enrollment",
    "room", "building", "room_type", "day", "room_capacity", "start_time",
    "end_time", "duration", "exam_datetime", "exam_building", "exam_room",
    "course_language", "teaching_hours", "contact_hours", "online_section",
    "cross_listed_with", "section_capacity",
)


class ScheduleError(RuntimeError):
    pass


class PoliteSession(requests.Session):
    """One-at-a-time session with retries only for safe GET requests."""

    def __init__(self) -> None:
        super().__init__()
        self._next_request_at = 0.0
        retry = Retry(total=3, connect=3, read=3, status=3, backoff_factor=1,
                      status_forcelist=(429, 500, 502, 503, 504), allowed_methods=frozenset({"GET"}),
                      respect_retry_after_header=True)
        self.mount("https://", HTTPAdapter(max_retries=retry))

    def request(self, *args: object, **kwargs: object) -> requests.Response:
        delay = self._next_request_at - time.monotonic()
        if delay > 0:
            time.sleep(delay)
        response = super().request(*args, **kwargs)
        self._next_request_at = time.monotonic() + MIN_REQUEST_INTERVAL
        return response


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def pipeline_version() -> str:
    """Return the collector's Git revision, or an explicit unknown value."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=Path(__file__).resolve().parent.parent,
            capture_output=True,
            check=False,
            text=True,
        )
    except OSError:
        return "unknown"
    return result.stdout.strip() if result.returncode == 0 and result.stdout.strip() else "unknown"


PIPELINE_VERSION: Final = pipeline_version()


def clean(value: str) -> str | None:
    value = " ".join(value.split())
    return value or None


def normalize(value: str) -> str:
    return " ".join(value.casefold().split())


def option_value(soup: BeautifulSoup, name: str, label: str) -> str:
    select = soup.find("select", attrs={"name": name})
    if select is None:
        raise ScheduleError(f"The page no longer contains {name!r}.")
    wanted = normalize(label)
    for option in select.find_all("option"):
        if normalize(option.get_text(" ", strip=True)) == wanted:
            return option.get("value", "")
    choices = ", ".join(option.get_text(" ", strip=True) for option in select.find_all("option"))
    raise ScheduleError(f"{label!r} is not an available option for {name}. Choices: {choices}")


def form_data(soup: BeautifulSoup) -> dict[str, str]:
    """Return current Web Forms state and selected control values."""
    data: dict[str, str] = {}
    for element in soup.select("input[name], select[name]"):
        name = element["name"]
        kind = element.get("type", "")
        if kind in {"submit", "button", "image"}:
            continue
        if element.name == "select":
            option = element.select_one("option[selected]") or element.select_one("option")
            data[name] = option.get("value", "") if option else ""
        elif kind in {"checkbox", "radio"}:
            if element.has_attr("checked"):
                data[name] = element.get("value", "on")
        else:
            data[name] = element.get("value", "")
    return data


def post(session: requests.Session, url: str, data: dict[str, str]) -> requests.Response:
    response = session.post(url, data=data, timeout=TIMEOUT)
    response.raise_for_status()
    return response


def postback(session: requests.Session, soup: BeautifulSoup, target: str, updates: dict[str, str]) -> BeautifulSoup:
    data = form_data(soup)
    data.update(updates)
    data["__EVENTTARGET"] = target
    data["__EVENTARGUMENT"] = ""
    return BeautifulSoup(post(session, FORM_URL, data).text, "html.parser")


def choose_college(session: requests.Session, soup: BeautifulSoup, college: str) -> BeautifulSoup:
    return postback(session, soup, NAMES["college"], {NAMES["college"]: option_value(soup, NAMES["college"], college)})


def choose_level(session: requests.Session, soup: BeautifulSoup, level: str) -> BeautifulSoup:
    if level == "all":
        return soup
    value = LEVELS[level]
    # UG/PG radios use an item-specific Web Forms postback target.
    return postback(session, soup, f"{NAMES['level']}${value}", {NAMES["level"]: value})


def choose_course_code(session: requests.Session, soup: BeautifulSoup, course_code: str) -> BeautifulSoup:
    # SIS applies this filter through an onchange postback before Preview.
    return postback(session, soup, NAMES["course_code"], {NAMES["course_code"]: course_code})


def request_report(session: requests.Session, soup: BeautifulSoup, args: argparse.Namespace) -> requests.Response:
    data = form_data(soup)
    data[NAMES["level"]] = LEVELS[args.level]
    data[NAMES["year"]] = option_value(soup, NAMES["year"], args.year)
    data[NAMES["semester"]] = option_value(soup, NAMES["semester"], args.semester)
    data[NAMES["language"]] = LANGUAGES[args.language]
    data[NAMES["course_code"]] = args.course_code or ""
    if args.department:
        data[NAMES["department"]] = option_value(soup, NAMES["department"], args.department)
    for argument, field in ((args.ramadan_timings, "ramadan"), (args.university_electives, "university_electives"), (args.university_requirements, "university_requirements")):
        if argument:
            data[NAMES[field]] = "on"
        else:
            data.pop(NAMES[field], None)
    data[NAMES["preview"]] = "Preview"
    data["__EVENTTARGET"] = ""
    data["__EVENTARGUMENT"] = ""
    return post(session, FORM_URL, data)


def atomic_write(path: Path, content: bytes | str, *, encoding: str | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = "wb" if isinstance(content, bytes) else "w"
    with tempfile.NamedTemporaryFile(mode, dir=path.parent, delete=False, encoding=encoding) as temporary:
        temporary.write(content)
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)


def save_capture(directory: Path, name: str, response: requests.Response, metadata: dict[str, object]) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    content_path = directory / name
    atomic_write(content_path, response.content)
    metadata.update(
        pipeline_version=PIPELINE_VERSION,
        source_url=response.url,
        retrieved_at=utc_now(),
        content_type=response.headers.get("content-type"),
        content_sha256=hashlib.sha256(response.content).hexdigest(),
        byte_count=len(response.content),
    )
    atomic_write(content_path.with_suffix(content_path.suffix + ".metadata.json"), json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return content_path


def next_page_target(soup: BeautifulSoup) -> str | None:
    for button in soup.find_all("input", attrs={"title": "Next Page", "type": "image"}):
        if button.has_attr("disabled"):
            continue
        container = button.find_parent("div", id=True)
        if container is None:
            raise ScheduleError("The visible Next Page control has no postback container.")
        # ReportViewer's client script posts the parent control ID, not image coordinates.
        return container["id"].replace("_", "$")
    return None


def has_report_rows(soup: BeautifulSoup) -> bool:
    return any(
        len(cells := tr.find_all(["td", "th"], recursive=False)) == len(REPORT_COLUMNS)
        and any(clean(cell.get_text(" ", strip=True)) for cell in cells)
        and clean(cells[0].get_text(" ", strip=True)) != "Collage"
        for tr in soup.find_all("tr")
    )


def fetch_report_pages(session: requests.Session, first_page: requests.Response, raw_dir: Path, term: str) -> list[Path]:
    """Save every data-bearing viewer page; ReportViewer ends paging with a shell page."""
    pages: list[Path] = []
    response = first_page
    seen_hashes: set[str] = set()
    for page_number in range(1, 100):  # hard stop prevents an unexpected pagination loop
        soup = BeautifulSoup(response.text, "html.parser")
        if not has_report_rows(soup):
            if not pages:
                raise ScheduleError("The report viewer did not return a schedule table.")
            return pages
        digest = hashlib.sha256(response.content).hexdigest()
        if digest in seen_hashes:
            raise ScheduleError("Report viewer repeated a data page while paging.")
        seen_hashes.add(digest)
        pages.append(save_capture(raw_dir, f"report-viewer-page-{page_number:03}.html", response, {
            "source_url": REPORT_URL, "term": term, "generator": "scripts/scrape_schedule.py",
            "stage": "report_viewer", "page": page_number,
        }))
        event_target = next_page_target(soup)
        if event_target is None:
            return pages
        data = form_data(soup)
        data["__EVENTTARGET"] = event_target
        data["__EVENTARGUMENT"] = ""
        response = post(session, REPORT_URL, data)
    raise ScheduleError("Report viewer exceeded 99 data pages.")


def report_rows(page_paths: list[Path]) -> tuple[list[dict[str, str | None]], int]:
    rows: list[dict[str, str | None]] = []
    seen: set[tuple[str | None, ...]] = set()
    duplicates = 0
    for path in page_paths:
        soup = BeautifulSoup(path.read_bytes(), "html.parser")
        for tr in soup.find_all("tr"):
            cells = tr.find_all(["td", "th"], recursive=False)
            if len(cells) != len(REPORT_COLUMNS):
                continue
            values = tuple(clean(cell.get_text(" ", strip=True)) for cell in cells)
            if not any(values) or values[0] == "Collage":  # layout row or source's repeated header
                continue
            if values in seen:
                duplicates += 1
                continue
            seen.add(values)
            rows.append(dict(zip(REPORT_COLUMNS, values, strict=True)))
    if not rows:
        raise ScheduleError("No 27-column schedule rows found in the report viewer output.")
    return rows, duplicates


def time_value(value: str | None, field: str, row: dict[str, str | None]) -> str:
    if value is None or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d", value):
        raise ScheduleError(f"Invalid {field} {value!r} for {row['course_code']} section {row['section_code']}.")
    return value[:5]


def location_status(row: dict[str, str | None]) -> str:
    room = normalize(row["room"] or "")
    building = normalize(row["building"] or "")
    if room in UNKNOWN_LOCATION_MARKERS or building in UNKNOWN_LOCATION_MARKERS:
        return "unknown"
    return "known"


def meeting_id(section_id: str, row: dict[str, str | None]) -> str:
    identity = "|".join(str(row[key] or "") for key in ("section_type", "day", "start_time", "end_time", "building", "room"))
    return f"{section_id}:{hashlib.sha256(identity.encode()).hexdigest()[:12]}"


def normalize_rows(rows: list[dict[str, str | None]], args: argparse.Namespace, source_paths: list[Path], duplicate_rows: int) -> dict[str, object]:
    courses: dict[str, dict[str, object]] = {}
    meeting_count = 0
    collapsed_co_taught_rows = 0
    for row in rows:
        course_id = row["course_code"]
        section_code = row["section_code"]
        if not course_id or not section_code or not row["course_title"]:
            raise ScheduleError("A schedule row is missing course code, section number, or course title.")
        course = courses.setdefault(course_id, {"course_id": course_id, "title": row["course_title"], "sections": {}})
        if course["title"] != row["course_title"]:
            raise ScheduleError(f"Conflicting titles for course {course_id}.")
        sections: dict[str, dict[str, object]] = course["sections"]  # type: ignore[assignment]
        section_id = f"{course_id}-{section_code}"
        section = sections.setdefault(section_id, {
            "section_id": section_id, "section_code": section_code,
            "department": row["department"], "instructors": [], "meetings": [], "_meeting_ids": set(),
            "credit_hours": row["credit_hours"], "course_language": row["course_language"],
            "enrollment": {"current": row["enrolled"], "maximum": row["max_enrollment"]},
        })
        instructor = row["instructor"]
        if instructor and normalize(instructor) not in {"to be announced", "tba"} and instructor not in section["instructors"]:  # type: ignore[operator]
            section["instructors"].append(instructor)  # type: ignore[index]
        day, start_raw, end_raw = row["day"], row["start_time"], row["end_time"]
        if day is None and start_raw is None and end_raw is None:
            continue
        if day not in DAYS:
            raise ScheduleError(f"Invalid day {day!r} for {course_id} section {section_code}.")
        start_time = time_value(start_raw, "start time", row)
        end_time = time_value(end_raw, "end time", row)
        if start_time >= end_time:
            raise ScheduleError(f"Non-positive meeting duration for {course_id} section {section_code}.")
        identifier = meeting_id(section_id, row)
        if identifier in section["_meeting_ids"]:  # type: ignore[operator]
            collapsed_co_taught_rows += 1
            continue
        section["_meeting_ids"].add(identifier)  # type: ignore[index]
        meeting = {
            "meeting_id": identifier, "type": row["section_type"], "days": [day],
            "start_time": start_time, "end_time": end_time, "building": row["building"], "room": row["room"],
            "room_type": row["room_type"], "location_status": location_status(row),
        }
        section["meetings"].append(meeting)  # type: ignore[index]
        meeting_count += 1

    serializable_courses = []
    for course in courses.values():
        sections = []
        for section in course["sections"].values():
            section.pop("_meeting_ids")
            section["meeting_status"] = "scheduled" if section["meetings"] else "unknown"
            sections.append(section)
        serializable_courses.append({**course, "sections": sections})

    return {
        "schema_version": 1,
        "generator": "scripts/scrape_schedule.py",
        "generated_at": utc_now(),
        "term": {"term_id": f"{args.year}-{args.semester.upper()}", "label": f"{args.semester} {args.year}", "timezone": "Asia/Muscat"},
        "source": {"url": FORM_URL, "captures": [{"path": str(path), "sha256": json.loads(path.with_suffix(path.suffix + ".metadata.json").read_text(encoding="utf-8"))["content_sha256"]} for path in source_paths]},
        "record_counts": {"courses": len(courses), "sections": sum(len(c["sections"]) for c in courses.values()), "meetings": meeting_count, "unscheduled_sections": sum(section["meeting_status"] == "unknown" for course in serializable_courses for section in course["sections"]), "duplicate_source_rows": duplicate_rows, "collapsed_co_taught_rows": collapsed_co_taught_rows},
        "courses": serializable_courses,
    }


def selection_slug(args: argparse.Namespace) -> str:
    filters = "-".join(name for name, enabled in (("ramadan", args.ramadan_timings), ("university-electives", args.university_electives), ("university-requirements", args.university_requirements)) if enabled) or "standard"
    return re.sub(r"[^a-z0-9]+", "-", f"{args.year}-{args.semester}-{args.college}-{args.department or 'all-departments'}-{args.language}-{filters}".casefold()).strip("-")


def default_raw_dir(args: argparse.Namespace) -> Path:
    return Path("data/raw/sis") / selection_slug(args)


def default_processed_path(args: argparse.Namespace) -> Path:
    return Path("data/processed") / f"{selection_slug(args)}.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", required=True, help="Academic year label, e.g. 2026/2027")
    parser.add_argument("--semester", required=True, help="Semester label, e.g. Fall")
    parser.add_argument("--college", required=True, help="Exact college label shown by SIS")
    parser.add_argument("--department", help="Exact department label shown after selecting college")
    parser.add_argument("--level", choices=LEVELS, default="all")
    parser.add_argument("--language", choices=LANGUAGES, default="english")
    parser.add_argument("--course-code", help="Optional course-code filter")
    parser.add_argument("--ramadan-timings", action="store_true")
    parser.add_argument("--university-electives", action="store_true")
    parser.add_argument("--university-requirements", action="store_true")
    parser.add_argument("--raw-output", type=Path, help="Directory for untouched source captures")
    parser.add_argument("--processed-output", type=Path, help="Normalized JSON destination (default: selection-specific path)")
    parser.add_argument("--overwrite", action="store_true", help="Replace an existing raw capture or processed artifact")
    parser.add_argument("--no-preview", action="store_true", help="Validate selections without requesting a report")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    raw_dir = args.raw_output or default_raw_dir(args)
    processed_output = args.processed_output or default_processed_path(args)
    if not args.no_preview and not args.overwrite and (raw_dir.exists() and any(raw_dir.iterdir()) or processed_output.exists()):
        print("error: capture or processed output already exists; use --overwrite or choose explicit output paths.", file=sys.stderr)
        return 1
    session = PoliteSession()
    session.headers["User-Agent"] = USER_AGENT
    try:
        initial = session.get(FORM_URL, timeout=TIMEOUT)
        initial.raise_for_status()
        soup = choose_college(session, BeautifulSoup(initial.text, "html.parser"), args.college)
        soup = choose_level(session, soup, args.level)
        if args.course_code:
            soup = choose_course_code(session, soup, args.course_code)
        option_value(soup, NAMES["year"], args.year)
        option_value(soup, NAMES["semester"], args.semester)
        if args.department:
            option_value(soup, NAMES["department"], args.department)
        print(f"Selected: {args.year} / {args.semester} / {args.college} / {args.language}")
        if args.no_preview:
            return 0
        preview = request_report(session, soup, args)
        preview_path = save_capture(raw_dir, "preview-response.html", preview, {
            "source_url": FORM_URL, "term": f"{args.year} {args.semester}",
            "generator": "scripts/scrape_schedule.py", "stage": "preview",
        })
        print("Preview accepted; fetching report pages…", flush=True)
        viewer = session.get(REPORT_URL, timeout=TIMEOUT)
        viewer.raise_for_status()
        page_paths = fetch_report_pages(session, viewer, raw_dir, f"{args.year} {args.semester}")
        rows, duplicate_rows = report_rows(page_paths)
        dataset = normalize_rows(rows, args, [preview_path, *page_paths], duplicate_rows)
        atomic_write(processed_output, json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Saved {dataset['record_counts']['courses']} courses, {dataset['record_counts']['sections']} sections, and {dataset['record_counts']['meetings']} meetings to {processed_output}")
        return 0
    except (requests.RequestException, ScheduleError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
