import timetable from "../../data/processed/2026-2027-fall-all-schedules.json";

export type MeetingDay = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export type PublishedMeeting = {
  meeting_id: string;
  days: MeetingDay[];
  start_time: string;
  end_time: string;
  building: string | null;
  room: string | null;
  room_type?: string | null;
  location_status: "known" | "tba" | "online" | "unknown";
};

export type PublishedSection = {
  section_id: string;
  meetings: PublishedMeeting[];
};

export type PublishedCourse = {
  course_id: string;
  sections: PublishedSection[];
};

export type PublishedTimetable = {
  term: {
    term_id: string;
    label: string;
    timezone: string;
  };
  courses: PublishedCourse[];
};

export const publishedTimetable = timetable as PublishedTimetable;
