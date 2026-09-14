import { render } from "solid-js/web";
import { formatSnapshotTime, publishedSnapshot } from "./data/snapshot";
import "./styles.css";

type Tool = {
  path: string;
  title: string;
  summary: string;
  availability: string;
  featured?: boolean;
};

const tools: Tool[] = [
  {
    path: "/schedule-builder",
    title: "Schedule Builder",
    summary: "Pick course sections and compare combinations without time conflicts.",
    availability: "Next up",
    featured: true,
  },
  {
    path: "/empty-rooms",
    title: "Empty Room Finder",
    summary: "Check known room bookings by building, day, and time.",
    availability: "In preparation",
  },
  {
    path: "/academic-plan",
    title: "Academic Plan Helper",
    summary: "Keep a simple view of completed, current, and planned courses.",
    availability: "In preparation",
  },
];

function SnapshotNote() {
  return (
    <p class="snapshot-note">
      Fall 2026/2027 timetable snapshot · retrieved {formatSnapshotTime(publishedSnapshot.snapshot.source_retrieval_completed_at)}
    </p>
  );
}

function HomePage() {
  return (
    <main class="app-shell">
      <header class="site-header">
        <a class="wordmark" href="/">SQU Tools</a>
        <a class="data-link" href="#data">Schedule data</a>
      </header>

      <section class="home-intro" aria-labelledby="page-title">
        <p class="section-label">SQU planning tools</p>
        <h1 id="page-title">Plan the term with less tab switching.</h1>
        <p>Tools built from the published course schedule. No sign-in, no registration actions.</p>
      </section>

      <nav class="tool-grid" aria-label="Tools">
        {tools.map((tool) => (
          <a class={`tool-card${tool.featured ? " tool-card-featured" : ""}`} href={tool.path}>
            <div>
              <span class="tool-status">{tool.availability}</span>
              <h2>{tool.title}</h2>
              <p>{tool.summary}</p>
            </div>
            <span class="open-tool">Open tool</span>
          </a>
        ))}
      </nav>

      <section class="data-panel" id="data" aria-labelledby="data-heading">
        <div>
          <p class="section-label" id="data-heading">Current data</p>
          <SnapshotNote />
        </div>
        <p class="data-counts">
          {publishedSnapshot.record_counts.courses.toLocaleString()} courses<br />
          {publishedSnapshot.record_counts.sections.toLocaleString()} sections<br />
          {publishedSnapshot.record_counts.meetings.toLocaleString()} meetings
        </p>
      </section>
    </main>
  );
}

function ToolPage(props: { tool: Tool }) {
  return (
    <main class="app-shell tool-page">
      <header class="site-header">
        <a class="wordmark" href="/">SQU Tools</a>
        <a class="back-link" href="/">All tools</a>
      </header>
      <section class="tool-page-content" aria-labelledby="tool-title">
        <p class="section-label">{props.tool.availability}</p>
        <h1 id="tool-title">{props.tool.title}</h1>
        <p>{props.tool.summary}</p>
        <div class="coming-soon">This tool is not built yet. The route and page shell are ready for its isolated feature module.</div>
      </section>
      <footer><SnapshotNote /></footer>
    </main>
  );
}

function App() {
  const tool = tools.find(({ path }) => path === window.location.pathname);
  return tool ? <ToolPage tool={tool} /> : <HomePage />;
}

render(() => <App />, document.getElementById("root")!);
