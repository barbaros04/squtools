import { createEffect, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { formatSnapshotAge, formatSnapshotTime, publishedSnapshot } from "./data/snapshot";
import { TowerArt } from "./components/TowerArt";
import { EmptyRoomFinder } from "./features/empty-room-finder/EmptyRoomFinder";
import "./styles.css";

type Language = "en" | "ar";
type ToolId = "schedule-builder" | "empty-rooms" | "academic-plan";

type Tool = {
  id: ToolId;
  path: string;
};

const tools: Tool[] = [
  { id: "schedule-builder", path: "/schedule-builder" },
  { id: "empty-rooms", path: "/empty-rooms" },
  { id: "academic-plan", path: "/academic-plan" },
];

const copy = {
  en: {
    brand: "SQU Tools",
    allTools: "All tools",
    directoryTitle: "Student planning tools",
    directoryIntro: "Practical tools for planning your semester from the published timetable.",
    openTool: "Open",
    available: "Available",
    snapshot: "Fall 2026/2027 timetable snapshot — retrieved",
    courses: "courses",
    sections: "sections",
    meetings: "meetings",
    notBuilt: "This tool is being prepared.",
    tools: {
      "schedule-builder": {
        title: "Schedule Builder",
        summary: "Choose sections and compare timetable combinations.",
        availability: "Coming soon",
      },
      "empty-rooms": {
        title: "Empty Room Finder",
        summary: "Find rooms without scheduled meetings.",
        availability: "Available",
      },
      "academic-plan": {
        title: "Academic Plan Helper",
        summary: "Organize completed, current, and planned courses.",
        availability: "Coming soon",
      },
    },
  },
  ar: {
    brand: "أدوات SQU",
    allTools: "كل الأدوات",
    directoryTitle: "أدوات التخطيط الدراسي",
    directoryIntro: "أدوات عملية للتخطيط للفصل الدراسي بالاعتماد على الجدول المنشور.",
    openTool: "فتح",
    available: "متاح",
    snapshot: "بيانات جدول خريف 2026/2027 — جُمعت في",
    courses: "مقرر",
    sections: "شعبة",
    meetings: "موعد",
    notBuilt: "هذه الأداة قيد الإعداد.",
    tools: {
      "schedule-builder": {
        title: "مُنشئ الجدول الدراسي",
        summary: "اختر شعب المقررات وقارن بين خيارات الجدول.",
        availability: "قيد الإعداد",
      },
      "empty-rooms": {
        title: "البحث عن القاعات الشاغرة",
        summary: "اعثر على القاعات التي لا توجد فيها محاضرات مجدولة.",
        availability: "متاح",
      },
      "academic-plan": {
        title: "مساعد الخطة الدراسية",
        summary: "رتّب المقررات المنجزة والحالية والمخطط لها.",
        availability: "قيد الإعداد",
      },
    },
  },
} as const;

function SnapshotNote(props: { language: Language }) {
  const text = () => copy[props.language];
  return (
    <p class="snapshot-note">
      {text().snapshot} {formatSnapshotTime(publishedSnapshot.snapshot.source_retrieval_completed_at, props.language)} · {formatSnapshotAge(publishedSnapshot.snapshot.source_retrieval_completed_at, props.language)}
    </p>
  );
}

function Header(props: { language: Language; onLanguageChange: () => void; back?: boolean }) {
  const text = () => copy[props.language];
  return (
    <header class="site-header">
      <a class="wordmark" href="/">
        <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14v14H5zM9 9h6v6H9z" /></svg></span>
        <span>{text().brand}</span>
      </a>
      <nav class="header-actions" aria-label={text().brand}>
        {props.back && <a class="back-link" href="/">{text().allTools}</a>}
        <button class="language-switch" type="button" onClick={props.onLanguageChange} aria-label={props.language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}>
          <span class="language-label">{props.language === "en" ? "العربية" : "English"}</span>
        </button>
      </nav>
    </header>
  );
}

function HomePage(props: { language: Language; onLanguageChange: () => void }) {
  const text = () => copy[props.language];
  return (
    <main class="home-page">
      <TowerArt />
      <Header {...props} />
      <section class="home-intro" aria-labelledby="home-title">
        <h1 id="home-title">{text().directoryTitle}</h1>
        <p>{text().directoryIntro}</p>
      </section>
      <section class="tool-directory" aria-label={text().brand}>
        <nav class="tool-list" aria-label={text().brand}>
          {tools.map((tool) => {
            const item = () => text().tools[tool.id];
            return (
              <a class={`tool-row ${tool.id}`} href={tool.path}>
                <div class="tool-description">
                  <h2>{item().title}</h2>
                  <p>{item().summary}</p>
                </div>
                <div class="tool-row-meta">
                  {tool.id !== "empty-rooms" && <span class="tool-status">{item().availability}</span>}
                  <span class="tool-action" aria-hidden="true">{text().openTool} <span class="tool-chevron">›</span></span>
                </div>
              </a>
            );
          })}
        </nav>
      </section>
      <footer class="site-footer">
        <SnapshotNote language={props.language} />
        <p class="data-counts">
          {publishedSnapshot.record_counts.courses.toLocaleString()} {text().courses} · {publishedSnapshot.record_counts.sections.toLocaleString()} {text().sections} · {publishedSnapshot.record_counts.meetings.toLocaleString()} {text().meetings}
        </p>
      </footer>
    </main>
  );
}

function EmptyRoomPage(props: { language: Language; onLanguageChange: () => void }) {
  return (
    <main class="tool-page">
      <Header language={props.language} onLanguageChange={props.onLanguageChange} back />
      <EmptyRoomFinder language={props.language} />
      <footer class="site-footer"><SnapshotNote language={props.language} /></footer>
    </main>
  );
}

function ToolPage(props: { tool: Tool; language: Language; onLanguageChange: () => void }) {
  const text = () => copy[props.language];
  const item = () => text().tools[props.tool.id];
  return (
    <main>
      <Header language={props.language} onLanguageChange={props.onLanguageChange} back />
      <section aria-labelledby="tool-title">
        <p>{item().availability}</p>
        <h1 id="tool-title">{item().title}</h1>
        <p>{item().summary}</p>
        <p>{text().notBuilt}</p>
      </section>
      <footer><SnapshotNote language={props.language} /></footer>
    </main>
  );
}

function savedLanguage(): Language {
  try {
    return localStorage.getItem("squ-tools-language") === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

function App() {
  const [language, setLanguage] = createSignal<Language>(savedLanguage());
  const [isLanguageChanging, setIsLanguageChanging] = createSignal(false);
  const tool = tools.find(({ path }) => path === window.location.pathname);
  const toggleLanguage = () => {
    if (isLanguageChanging()) return;
    setIsLanguageChanging(true);
    window.setTimeout(() => {
      setLanguage((current) => current === "en" ? "ar" : "en");
      setIsLanguageChanging(false);
    }, 150);
  }; 

  createEffect(() => {
    const current = language();
    document.documentElement.lang = current;
    document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem("squ-tools-language", current);
    } catch {
      // Private browsing or disabled storage should not block language selection.
    }
  });


  const page = () => tool?.id === "empty-rooms"
    ? <EmptyRoomPage language={language()} onLanguageChange={toggleLanguage} />
    : tool
      ? <ToolPage tool={tool} language={language()} onLanguageChange={toggleLanguage} />
      : <HomePage language={language()} onLanguageChange={toggleLanguage} />;

  return <div classList={{ "app-shell": true, "language-changing": isLanguageChanging() }}>{page()}</div>;
}

render(() => <App />, document.getElementById("root")!);
