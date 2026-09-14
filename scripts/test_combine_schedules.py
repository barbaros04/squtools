import unittest
from pathlib import Path

import combine_schedules as combiner


class SelectedDatasetsTests(unittest.TestCase):
    def test_existing_combined_artifact_is_not_an_input(self):
        term = "2026-2027-fall"
        artifacts = [
            (Path(f"{term}-{college}-all-departments-english.json"), {})
            for college in combiner.EXPECTED_COLLEGES
        ]
        artifacts.extend([
            (Path(f"{term}-university-all-departments-english-university-electives.json"), {}),
            (Path(f"{term}-university-all-departments-english-university-requirements.json"), {}),
            (Path(f"{term}-all-schedules.json"), {}),
        ])

        selected = combiner.selected_datasets(artifacts)

        self.assertEqual(len(selected), 12)
        self.assertNotIn(Path(f"{term}-all-schedules.json"), [path for path, _ in selected])

    def test_audit_rejects_invalid_meeting_time(self):
        dataset = {
            "courses": [{"course_id": "TEST1000", "sections": [{
                "section_id": "TEST1000-01", "meeting_status": "scheduled", "meetings": [{
                    "meeting_id": "TEST1000-01:one", "days": ["SUN"], "start_time": "25:00", "end_time": "26:00",
                    "location_status": "known", "building": "Building", "room": "101",
                }],
            }]}],
            "source": {"captures": []},
        }

        _, errors = combiner.audit_dataset(Path("test.json"), dataset)

        self.assertIn("test.json: invalid meeting time or day", errors)


if __name__ == "__main__":
    unittest.main()
