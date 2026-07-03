"use client";

import { FormEvent, useState } from "react";
import { Course, CourseNode, LessonContent } from "@/lib/types";
import { CourseTree } from "@/components/CourseTree";
import { MindMap } from "@/components/MindMap";

type View = "course" | "mindmap";

type SelectedLesson = {
  module: CourseNode;
  lesson: CourseNode;
  lessonNumber: string;
  content?: LessonContent;
};

export default function Home() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("second-year medical student preparing for Step 1");
  const [depth, setDepth] = useState(2);
  const [course, setCourse] = useState<Course | null>(null);
  const [view, setView] = useState<View>("course");
  const [selectedLesson, setSelectedLesson] = useState<SelectedLesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function replaceBranch(current: Course, path: string[], newChildren: Course["nodes"]): Course {
    const visit = (nodes: Course["nodes"], remaining: string[]): Course["nodes"] => {
      const [target, ...rest] = remaining;
      return nodes.map((node) => {
        if (node.title !== target) return node;
        if (rest.length === 0) return { ...node, children: [...node.children, ...newChildren] };
        return { ...node, children: visit(node.children, rest) };
      });
    };

    return { ...current, nodes: visit(current.nodes, path) };
  }

  async function generate(e?: FormEvent, parentPath: string[] = []) {
    e?.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setSelectedLesson(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, audience, depth, format: view, parentPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (parentPath.length && course) {
        setCourse(replaceBranch(course, parentPath, data.course.nodes));
      } else {
        setCourse(data.course);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function openLesson(module: CourseNode, lesson: CourseNode, lessonNumber: string) {
    if (!course) return;
    setSelectedLesson({ module, lesson, lessonNumber });
    setLessonLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseTitle: course.topic,
          audience: course.audience,
          moduleTitle: module.title,
          lessonTitle: lesson.title,
          lessonNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lesson generation failed");
      setSelectedLesson({ module, lesson, lessonNumber, content: data.lesson });
      window.setTimeout(() => document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" }), 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLessonLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <nav>
          <div className="brand">WorthyLearn</div>
          <a href="#build">Build a course</a>
        </nav>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">AI generated syllabus + mindmap</p>
            <h1>Learn anything through a full course map.</h1>
            <p className="lede">
              Generate a full syllabus with modules, dozens of lessons, detailed lesson pages,
              and a clickable mindmap that opens each lesson.
            </p>
          </div>
          <form id="build" className="generator" onSubmit={generate}>
            <label>
              What can I help you learn?
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. advanced cell biology, renal physiology, immunology for Step 1" />
            </label>
            <label>
              Who is this for?
              <input value={audience} onChange={(e) => setAudience(e.target.value)} />
            </label>
            <label>
              Depth: {depth} <small>{depth === 2 ? "≈ 30-45 lessons" : depth > 2 ? "expanded course" : "compact course"}</small>
              <input type="range" min="1" max="5" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
            </label>
            <div className="format-row">
              <button type="button" className={view === "course" ? "active" : ""} onClick={() => setView("course")}>Course</button>
              <button type="button" className={view === "mindmap" ? "active" : ""} onClick={() => setView("mindmap")}>Mindmap</button>
            </div>
            <button className="primary" disabled={loading || !topic.trim()}>{loading ? "Generating…" : "Generate course"}</button>
            {error && <p className="error">{error}</p>}
          </form>
        </div>
      </section>

      {course && (
        <section className="results">
          <div className="results-header">
            <div>
              <p className="eyebrow">Generated syllabus</p>
              <h2>{course.topic}</h2>
              <p>{course.overview}</p>
            </div>
            <div className="tabs">
              <button className={view === "course" ? "active" : ""} onClick={() => setView("course")}>Outline</button>
              <button className={view === "mindmap" ? "active" : ""} onClick={() => setView("mindmap")}>Map</button>
            </div>
          </div>
          {view === "course" ? (
            <CourseTree nodes={course.nodes} onExpand={(path) => generate(undefined, path)} onLessonSelect={openLesson} />
          ) : (
            <MindMap topic={course.topic} nodes={course.nodes} onLessonSelect={openLesson} />
          )}
        </section>
      )}

      {selectedLesson && (
        <LessonReader id="lesson" selected={selectedLesson} loading={lessonLoading} />
      )}
    </main>
  );
}

function LessonReader({ selected, loading, id }: { selected: SelectedLesson; loading: boolean; id: string }) {
  const lesson = selected.content;
  return (
    <section id={id} className="lesson-reader">
      <div className="lesson-meta">Lesson {selected.lessonNumber} of {selected.module.title.replace(/^Module\s+\d+\s*:\s*/i, "")}</div>
      <h2>{lesson?.title || selected.lesson.title}</h2>
      {loading && <p className="lede">Generating full lesson…</p>}
      {lesson && (
        <>
          <p className="lesson-intro">{lesson.introduction}</p>
          {lesson.diagram && <LessonDiagram diagram={lesson.diagram} />}
          {lesson.sections.map((section) => (
            <article key={section.heading} className="lesson-section">
              <h3>{section.heading}</h3>
              {section.body.split(/\n\n+/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>
          ))}
          <article className="lesson-section summary-box">
            <h3>Summary</h3>
            <p>{lesson.summary}</p>
          </article>
          {lesson.checks.length > 0 && (
            <article className="lesson-section">
              <h3>Test your knowledge</h3>
              <ol>{lesson.checks.map((check) => <li key={check}>{check}</li>)}</ol>
            </article>
          )}
        </>
      )}
    </section>
  );
}

function LessonDiagram({ diagram }: { diagram: NonNullable<LessonContent["diagram"]> }) {
  return (
    <div className="lesson-diagram">
      <strong>{diagram.title}</strong>
      <div className="diagram-flow">
        {diagram.nodes.slice(0, 8).map((node, index) => (
          <span key={`${node}-${index}`}>{node}</span>
        ))}
      </div>
    </div>
  );
}
