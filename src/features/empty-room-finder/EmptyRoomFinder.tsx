import { createMemo, createSignal } from "solid-js";
import { publishedTimetable, type MeetingDay } from "../../data/timetable";
import { buildKnownRooms, findRoomFreeRuns, listBuildings } from "./availability";

type Language = "en" | "ar";

type RoomQuery = {
  day: MeetingDay;
  time: string;
  building: string;
};

const knownRooms = buildKnownRooms(publishedTimetable.courses);
const buildings = listBuildings(knownRooms);
const days: MeetingDay[] = ["SUN", "MON", "TUE", "WED", "THU"]; 
const weekdayMap: Record<string, MeetingDay> = {
  Sun: "SUN", Mon: "MON", Tue: "TUE", Wed: "WED", Thu: "THU", Fri: "FRI", Sat: "SAT",
};

const copy = {
  en: {
    title: "Empty Room Finder",
    intro: "Check known rooms in one building against the published timetable.",
    caveat: "This is not live room occupancy.",
    when: "When do you need a room?",
    day: "Day",
    time: "Time",
    now: "Now",
    chooseWhen: "Choose day and time",
    changeWhen: "Change day and time",
    selectionHint: "Select the day, then a 15-minute time slot.",
    cancel: "Cancel",
    apply: "Use this time",
    where: "Where do you need it?",
    building: "Building",
    chooseBuilding: "Choose a building",
    search: "Find available rooms",
    results: "Available rooms",
    resultCount: (count: number) => `${count} room${count === 1 ? "" : "s"}`,
    resultsFor: "Known rooms with no scheduled class at this time",
    sortedByAvailability: "Rooms are ordered by the longest free time first.",
    freeFor: (duration: string) => `Free for ${duration}`,
    noLaterClass: "No later class scheduled",
    noResults: "No known rooms are available in this building at that time.",
    room: "Room",
    source: "Results use the published timetable snapshot, not live availability.",
    days: { SUN: "Sunday", MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday" },
  },
  ar: {
    title: "البحث عن القاعات الشاغرة",
    intro: "تحقق من القاعات المعروفة في مبنى واحد بالاعتماد على الجدول المنشور.",
    caveat: "هذه ليست حالة إشغال مباشرة للقاعات.",
    when: "متى تحتاج قاعة؟",
    day: "اليوم",
    time: "الوقت",
    now: "الآن",
    chooseWhen: "اختر اليوم والوقت",
    changeWhen: "غيّر اليوم والوقت",
    selectionHint: "اختر اليوم، ثم خانة وقت لمدة 15 دقيقة.",
    cancel: "إلغاء",
    apply: "استخدم هذا الوقت",
    where: "أين تحتاجها؟",
    building: "المبنى",
    chooseBuilding: "اختر مبنى",
    search: "ابحث عن القاعات المتاحة",
    results: "القاعات المتاحة",
    resultCount: (count: number) => `${count} قاعة`,
    resultsFor: "قاعات معروفة لا توجد فيها محاضرة مجدولة في هذا الوقت",
    sortedByAvailability: "تُرتّب القاعات حسب أطول وقت شاغر أولاً.",
    freeFor: (duration: string) => `متاحة لمدة ${duration}`,
    noLaterClass: "لا توجد محاضرة مجدولة لاحقاً",
    noResults: "لا توجد قاعات معروفة متاحة في هذا المبنى في ذلك الوقت.",
    room: "القاعة",
    source: "تعتمد النتائج على لقطة الجدول المنشور وليست حالة إشغال مباشرة.",
    days: { SUN: "الأحد", MON: "الاثنين", TUE: "الثلاثاء", WED: "الأربعاء", THU: "الخميس", FRI: "الجمعة", SAT: "السبت" },
  },
} as const;

function muscatNow(): Pick<RoomQuery, "day" | "time"> {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Muscat",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  const hour = Number(part("hour"));
  const minute = Math.floor(Number(part("minute")) / 15) * 15;

  const detectedDay = weekdayMap[part("weekday")];
  return {
    day: days.includes(detectedDay) ? detectedDay : "SUN",
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function timeToSlot(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 4 + Math.floor(minutes / 15);
}

function slotToTime(slot: number): string {
  const hours = Math.floor(slot / 4);
  const minutes = (slot % 4) * 15;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours}h ${remainder}m`;
  if (hours) return `${hours}h`;
  return `${remainder}m`;
}

function formatTime(time: string): string {
  const [rawHours, minutes] = time.split(":").map(Number);
  const period = rawHours < 12 ? "AM" : "PM";
  const hours = rawHours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function savedBuilding(): string {
  try {
    const value = localStorage.getItem("squ-tools-building");
    return value && buildings.includes(value) ? value : "";
  } catch {
    return "";
  }
}

export function EmptyRoomFinder(props: { language: Language }) {
  const text = () => copy[props.language];
  const current = muscatNow();
  const [day, setDay] = createSignal<MeetingDay>(current.day);
  const [time, setTime] = createSignal(current.time);
  const [isWhenDialogOpen, setIsWhenDialogOpen] = createSignal(false);
  const [draftDay, setDraftDay] = createSignal<MeetingDay>(current.day);
  const [draftTime, setDraftTime] = createSignal(current.time);
  const [building, setBuilding] = createSignal(savedBuilding());
  const [submittedQuery, setSubmittedQuery] = createSignal<RoomQuery | null>(null);
  const rooms = createMemo(() => {
    const query = submittedQuery();
    return query ? findRoomFreeRuns(knownRooms, { day: query.day, startTime: query.time, building: query.building }) : [];
  });

  const chooseBuilding = (value: string) => {
    setBuilding(value);
    try { localStorage.setItem("squ-tools-building", value); } catch { /* Persistence is optional. */ }
  };

  const openWhenDialog = () => {
    setDraftDay(day());
    setDraftTime(time());
    setIsWhenDialogOpen(true);
  };

  const applyWhen = () => {
    setDay(draftDay());
    setTime(draftTime());
    setIsWhenDialogOpen(false);
  };

  const useCurrentTime = () => {
    const now = muscatNow();
    setDraftDay(now.day);
    setDraftTime(now.time);
  };

  const search = (event: SubmitEvent) => {
    event.preventDefault();
    if (!building()) return;
    setSubmittedQuery({ day: day(), time: time(), building: building() });
  };

  return (
    <section class="room-finder" aria-labelledby="room-finder-title">
      <div class="room-finder-intro">
        <h1 id="room-finder-title">{text().title}</h1>
        <p>{text().intro}</p>
        <p class="room-caveat">{text().caveat}</p>
      </div>

      <form class="room-query" onSubmit={search}>
        <fieldset>
          <legend>{text().when}</legend>
          <button class="when-trigger" type="button" onClick={openWhenDialog} aria-haspopup="dialog">
            <span class="when-trigger-label">{text().changeWhen}</span>
            <strong>{text().days[day()]} · {formatTime(time())}</strong>
          </button>
        </fieldset>

        <fieldset>
          <legend>{text().where}</legend>
          <label>
            <span>{text().building}</span>
            <select value={building()} onChange={(event) => chooseBuilding(event.currentTarget.value)} required>
              <option value="" disabled>{text().chooseBuilding}</option>
              {buildings.map((value) => <option value={value}>{value}</option>)}
            </select>
          </label>
        </fieldset>

        <button class="primary-button" type="submit">{text().search}</button>
      </form>

      {isWhenDialogOpen() && <div class="when-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsWhenDialogOpen(false); }}>
        <section class="when-modal" role="dialog" aria-modal="true" aria-labelledby="when-modal-title" onKeyDown={(event) => { if (event.key === "Escape") setIsWhenDialogOpen(false); }}>
          <div class="when-modal-heading">
            <div>
              <h2 id="when-modal-title">{text().chooseWhen}</h2>
              <p>{text().selectionHint}</p>
            </div>
            <button class="modal-close" type="button" onClick={() => setIsWhenDialogOpen(false)} aria-label={text().cancel}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div class="day-picker" role="group" aria-label={text().day}>
            {days.map((value) => <button type="button" classList={{ selected: draftDay() === value }} onClick={() => setDraftDay(value)}>{text().days[value]}</button>)}
          </div>
          <div class="time-picker">
            <div class="time-picker-heading">
              <span>{text().time}</span>
              <button class="now-button" type="button" onClick={useCurrentTime}>{text().now}</button>
            </div>
            <output>{formatTime(draftTime())}</output>
            <input id="time-slider" type="range" min="0" max="95" step="1" value={timeToSlot(draftTime())} aria-valuetext={formatTime(draftTime())} onInput={(event) => setDraftTime(slotToTime(Number(event.currentTarget.value)))} />
            <div class="time-scale" aria-hidden="true"><span>12 AM</span><span>12 PM</span><span>11:45 PM</span></div>
          </div>
          <div class="when-modal-actions">
            <button class="secondary-button" type="button" onClick={() => setIsWhenDialogOpen(false)}>{text().cancel}</button>
            <button class="primary-button" type="button" onClick={applyWhen}>{text().apply}</button>
          </div>
        </section>
      </div>}

      {submittedQuery() && <section class="room-results" aria-live="polite" aria-labelledby="room-results-title">
        <div class="room-results-heading">
          <h2 id="room-results-title">{text().results} <span class="results-count">{text().resultCount(rooms().length)}</span></h2>
          <p>{text().resultsFor}</p>
        </div>
        {rooms().length > 0 ? (
          <>
            <p class="room-sort-note">{text().sortedByAvailability}</p>
            <ul class="room-list">
              {rooms().map((freeRun) => <li>
                <div><strong>{freeRun.room.room}</strong>{freeRun.room.roomType && <span>{freeRun.room.roomType}</span>}</div>
                <span class="room-duration">{freeRun.durationMinutes === null ? text().noLaterClass : text().freeFor(formatDuration(freeRun.durationMinutes))}</span>
              </li>)}
            </ul>
          </>
        ) : <p class="room-empty">{text().noResults}</p>}
        <p class="room-source-note">{text().source}</p>
      </section>}
    </section>
  );
}
