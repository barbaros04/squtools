import type { MeetingDay, PublishedCourse, PublishedMeeting } from "../../data/timetable";

export type RoomMeeting = {
  day: MeetingDay;
  startTime: string;
  endTime: string;
};

export type KnownRoom = {
  key: string;
  building: string;
  room: string;
  roomType: string | null;
  meetings: RoomMeeting[];
};

export type AvailabilityQuery = {
  day: MeetingDay;
  startTime: string;
  endTime?: string;
  building?: string;
};

export type FreeRunQuery = {
  day: MeetingDay;
  startTime: string;
  building?: string;
};

export type RoomFreeRun = {
  room: KnownRoom;
  nextMeetingStart: string | null;
  durationMinutes: number | null;
};

export type InferredRoom = {
  building: string;
  room: string;
};

function roomKey(building: string, room: string): string {
  return `${building.trim().toLocaleUpperCase()}::${room.trim().toLocaleUpperCase()}`;
}

const nonPhysicalLocationKeys = new Set([
  "DISTANCE LEARNING::DLR",
  "PROJECT::PRO",
  "THESIS::THES",
]);

function isKnownPhysicalMeeting(meeting: PublishedMeeting): meeting is PublishedMeeting & { building: string; room: string } {
  return meeting.location_status === "known"
    && Boolean(meeting.building?.trim())
    && Boolean(meeting.room?.trim())
    && !nonPhysicalLocationKeys.has(roomKey(meeting.building!, meeting.room!));
}

function toMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return Number.NaN;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? hours * 60 + minutes : Number.NaN;
}

function overlaps(meeting: RoomMeeting, startTime: string, endTime: string): boolean {
  return toMinutes(startTime) < toMinutes(meeting.endTime) && toMinutes(endTime) > toMinutes(meeting.startTime);
}

export function buildKnownRooms(courses: PublishedCourse[]): KnownRoom[] {
  const rooms = new Map<string, KnownRoom>();

  for (const course of courses) {
    for (const section of course.sections) {
      for (const meeting of section.meetings) {
        if (!isKnownPhysicalMeeting(meeting)) continue;

        const key = roomKey(meeting.building, meeting.room);
        const room = rooms.get(key) ?? {
          key,
          building: meeting.building,
          room: meeting.room,
          roomType: meeting.room_type ?? null,
          meetings: [],
        };

        for (const day of meeting.days) {
          room.meetings.push({ day, startTime: meeting.start_time, endTime: meeting.end_time });
        }

        rooms.set(key, room);
      }
    }
  }

  return [...rooms.values()].sort((left, right) =>
    left.building.localeCompare(right.building) || left.room.localeCompare(right.room),
  );
}

export function findAvailableRooms(rooms: KnownRoom[], query: AvailabilityQuery): KnownRoom[] {
  const start = toMinutes(query.startTime);
  const end = query.endTime ? toMinutes(query.endTime) : undefined;
  if (!Number.isFinite(start) || (query.endTime && (!Number.isFinite(end) || start >= end!))) return [];

  return rooms.filter((room) => {
    if (query.building && room.building !== query.building) return false;
    return !room.meetings.some((meeting) => {
      if (meeting.day !== query.day) return false;
      return query.endTime
        ? overlaps(meeting, query.startTime, query.endTime)
        : start >= toMinutes(meeting.startTime) && start < toMinutes(meeting.endTime);
    });
  });
}

export function inferNumberedRoomGaps(rooms: KnownRoom[], building: string): InferredRoom[] {
  const roomNames = new Set(rooms.filter((room) => room.building === building).map((room) => room.room));
  const sequences = new Map<string, { prefix: string; width: number; numbers: Set<number> }>();

  for (const room of roomNames) {
    const match = /^(.*?)(\d+)$/.exec(room);
    if (!match) continue;
    const [, prefix, digits] = match;
    const key = `${prefix}::${digits.length}`;
    const sequence = sequences.get(key) ?? { prefix, width: digits.length, numbers: new Set<number>() };
    sequence.numbers.add(Number(digits));
    sequences.set(key, sequence);
  }

  const inferred: InferredRoom[] = [];
  for (const { prefix, width, numbers } of sequences.values()) {
    for (const number of numbers) {
      const missing = number + 1;
      if (!numbers.has(missing) && numbers.has(missing + 1)) {
        inferred.push({ building, room: `${prefix}${String(missing).padStart(width, "0")}` });
      }
    }
  }

  return inferred.sort((left, right) => left.room.localeCompare(right.room));
}

export function findRoomFreeRuns(rooms: KnownRoom[], query: FreeRunQuery): RoomFreeRun[] {
  const start = toMinutes(query.startTime);
  if (!Number.isFinite(start)) return [];

  return rooms.flatMap((room) => {
    if (query.building && room.building !== query.building) return [];

    const dayMeetings = room.meetings.filter((meeting) => meeting.day === query.day);
    if (dayMeetings.some((meeting) => start >= toMinutes(meeting.startTime) && start < toMinutes(meeting.endTime))) return [];

    const nextMeetingStart = dayMeetings
      .map((meeting) => meeting.startTime)
      .filter((time) => toMinutes(time) > start)
      .sort((left, right) => toMinutes(left) - toMinutes(right))[0] ?? null;

    return [{
      room,
      nextMeetingStart,
      durationMinutes: nextMeetingStart ? toMinutes(nextMeetingStart) - start : null,
    }];
  }).sort((left, right) => {
    if (left.durationMinutes === null && right.durationMinutes !== null) return -1;
    if (left.durationMinutes !== null && right.durationMinutes === null) return 1;
    if (left.durationMinutes !== null && right.durationMinutes !== null && left.durationMinutes !== right.durationMinutes) {
      return right.durationMinutes - left.durationMinutes;
    }
    return left.room.building.localeCompare(right.room.building) || left.room.room.localeCompare(right.room.room);
  });
}

export function listBuildings(rooms: KnownRoom[]): string[] {
  return [...new Set(rooms.map((room) => room.building))].sort((left, right) => left.localeCompare(right));
}
