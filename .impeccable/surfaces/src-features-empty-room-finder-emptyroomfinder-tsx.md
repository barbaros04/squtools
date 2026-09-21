---
version: 1
slug: "src-features-empty-room-finder-emptyroomfinder-tsx"
primary_target: "src/features/empty-room-finder/EmptyRoomFinder.tsx"
related_targets: ["src/features/empty-room-finder/availability.ts"]
---

# Empty Room Finder

## Scope

- **Mode:** Operate
- **Audience:** SQU students looking for a known room in a specific building at a specific weekly timetable time.
- **Task:** Choose when and where, then see rooms with no scheduled class in the published snapshot.
- **Constraints:** Building is required and persisted locally; single point-in-time query only; bilingual LTR/RTL; no live-occupancy claim.

## Direction contract

**THESIS:** A direct two-question query replaces the old mode-heavy finder: when do you need a room, and where do you need it?

**OWN-WORLD:** The home’s quiet academic workspace continues into a light, single-column form with charcoal text, cool-gray dividers, deep-blue actions and focus, and restrained green only for confirmed available-room results.

**STORY:** The student selects a building once, has it remembered, sets a day and time, and receives a focused answer for that building without interpreting modes, rails, or time-range mechanics.

**FIRST VIEWPORT:** A compact header and back link lead to a practical title and snapshot caveat. A form follows with a “When do you need a room?” fieldset for day and time, a required “Where?” building selector, and one full-width “Find available rooms” action.

**FORM:** Quiet Academic Workspace extension; single point-in-time query. The building selection persists in local storage, but room availability remains calculated from the published timetable only.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
