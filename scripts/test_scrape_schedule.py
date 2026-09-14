import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from bs4 import BeautifulSoup

import scrape_schedule as scraper


BASE_ROW = {
    "college": "College", "course_code": "TEST1000", "credit_hours": "3.0", "section_code": "01",
    "course_title": "Test Course", "section_type": "LEC", "department": "Department", "instructor": "A",
    "enrolled": "1", "max_enrollment": "20", "room": "101", "building": "Building", "room_type": "Classroom",
    "day": "SUN", "room_capacity": "20", "start_time": "08:00:00", "end_time": "09:20:00",
    "duration": "1:20", "exam_datetime": None, "exam_building": None, "exam_room": None,
    "course_language": "English", "teaching_hours": "3.0", "contact_hours": "45", "online_section": "No",
    "cross_listed_with": None, "section_capacity": "20",
}
ARGS = SimpleNamespace(year="2026/2027", semester="Fall")


class NormalizeRowsTests(unittest.TestCase):
    def test_co_taught_rows_become_one_meeting_with_all_instructors(self):
        second = {**BASE_ROW, "instructor": "B"}
        dataset = scraper.normalize_rows([BASE_ROW, second], ARGS, [], 0)
        section = dataset["courses"][0]["sections"][0]
        self.assertEqual(section["instructors"], ["A", "B"])
        self.assertEqual(len(section["meetings"]), 1)
        self.assertEqual(dataset["record_counts"]["collapsed_co_taught_rows"], 1)

    def test_unscheduled_row_does_not_override_a_scheduled_meeting(self):
        unscheduled = {**BASE_ROW, "day": None, "start_time": None, "end_time": None}
        dataset = scraper.normalize_rows([unscheduled, BASE_ROW], ARGS, [], 0)
        section = dataset["courses"][0]["sections"][0]
        self.assertEqual(section["meeting_status"], "scheduled")
        self.assertEqual(len(section["meetings"]), 1)

    def test_unscheduled_section_is_retained(self):
        row = {**BASE_ROW, "day": None, "start_time": None, "end_time": None}
        dataset = scraper.normalize_rows([row], ARGS, [], 0)
        section = dataset["courses"][0]["sections"][0]
        self.assertEqual(section["meeting_status"], "unknown")
        self.assertEqual(section["meetings"], [])

    def test_non_specific_room_is_never_marked_free(self):
        self.assertEqual(scraper.location_status({**BASE_ROW, "room": "NOR", "building": "No Room Available"}), "unknown")


class CaptureProvenanceTests(unittest.TestCase):
    def test_capture_records_pipeline_version(self):
        response = SimpleNamespace(
            content=b"source response",
            url="https://example.test/report",
            headers={"content-type": "text/html"},
        )
        with tempfile.TemporaryDirectory() as temporary:
            path = scraper.save_capture(Path(temporary), "report.html", response, {"term": "2026/2027 Fall"})
            metadata = json.loads(path.with_suffix(".html.metadata.json").read_text(encoding="utf-8"))
        self.assertEqual(metadata["pipeline_version"], scraper.PIPELINE_VERSION)
        self.assertTrue(metadata["pipeline_version"])


class ReportViewerTests(unittest.TestCase):
    def test_next_page_uses_reportviewer_event_target(self):
        soup = BeautifulSoup("""
            <div id='ctl00_cntphmaster_UmisReportViewer_ctl05_ctl00_Next_ctl00'>
              <input type='image' title='Next Page' name='ignored'>
            </div>
        """, "html.parser")
        self.assertEqual(
            scraper.next_page_target(soup),
            "ctl00$cntphmaster$UmisReportViewer$ctl05$ctl00$Next$ctl00",
        )


if __name__ == "__main__":
    unittest.main()
