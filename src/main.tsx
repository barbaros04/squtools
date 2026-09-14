import { render } from "solid-js/web";
import { formatSnapshotTime, publishedSnapshot } from "./data/snapshot";
import "./styles.css";

type Tool = {
  page: string;
  title: string;
  summary: string;
  state: "Available next" | "In preparation";
  color: "cyan" | "yellow" | "magenta";
};

const tools: Tool[] = [
  {
    page: "101",
    title: "Schedule builder",
    summary: "Choose course sections. Keep only combinations that fit together.",
    state: "Available next",
    color: "cyan",
  },
  {
    page: "202",
    title: "Empty room finder",
    summary: "Check known physical room bookings by day, time, and building.",
    state: "In preparation",
    color: "yellow",
  },
  {
    page: "303",
    title: "Academic plan helper",
    summary: "Lay out courses you have taken and courses you are considering.",
    state: "In preparation",
    color: "magenta",
  },
];

function App() {
  return (
    <main class="teletext-shell">
      <header class="masthead">
        <a class="wordmark" href="/" aria-label="Squidwool home">SQUIDWOOL</a>
        <span>SQU student tools</span>
        <span class="page-number">100</span>
      </header>

      <section class="intro" aria-labelledby="page-title">
        <div class="signal-mark" aria-hidden="true"><i /><i /><i /><i /></div>
        <div>
          <h1 id="page-title">Plan the term.<br />Leave the tabs behind.</h1>
          <p>Small, local tools built around the published SQU timetable.</p>
        </div>
      </section>

      <nav class="tool-grid" aria-label="Squidwool tools">
        {tools.map((tool) => (
          <a class={`tool tool-${tool.color}`} href={`#${tool.title.toLowerCase().replaceAll(" ", "-")}`}>
            <span class="tool-page">{tool.page}</span>
            <h2>{tool.title}</h2>
            <p>{tool.summary}</p>
            <span class="tool-state">{tool.state}</span>
            <span class="tool-arrow" aria-hidden="true">›</span>
          </a>
        ))}
      </nav>

      <section class="snapshot" aria-label="Schedule data snapshot">
        <div class="snapshot-label">TIMETABLE SNAPSHOT</div>
        <p><strong>{publishedSnapshot.term.label}</strong> · retrieved {formatSnapshotTime(publishedSnapshot.snapshot.source_retrieval_completed_at)}</p>
        <p>{publishedSnapshot.record_counts.courses.toLocaleString()} courses · {publishedSnapshot.record_counts.sections.toLocaleString()} sections · {publishedSnapshot.record_counts.meetings.toLocaleString()} meetings</p>
        <a href="#data-notes">How this data is handled</a>
      </section>

      <footer>
        <span>Public SQU schedule data · snapshot, not live availability</span>
        <span>100&nbsp;&nbsp; 101&nbsp;&nbsp; 202&nbsp;&nbsp; 303</span>
      </footer>
    </main>
  );
}

render(() => <App />, document.getElementById("root")!);
