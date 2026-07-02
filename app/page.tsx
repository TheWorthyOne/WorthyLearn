"use client";

import { FormEvent, useState } from "react";
import { Course } from "@/lib/types";
import { CourseTree } from "@/components/CourseTree";
import { MindMap } from "@/components/MindMap";

type View = "course" | "mindmap";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("curious beginner");
  const [depth, setDepth] = useState(3);
  const [course, setCourse] = useState<Course | null>(null);
  const [view, setView] = useState<View>("course");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function replaceBranch(current: Course, path: string[], newChildren: Course["nodes"]): Course {
    const visit = (nodes: Course["nodes"], remaining: string[]): Course["nodes"] => {
      const [target, ...rest] = remaining;
      return nodes.map((node) => {
        if (node.title !== target) return node;
        if (rest.length === 0) return { ...node, children: newChildren };
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
            <h1>Learn anything through an expandable course map.</h1>
            <p className="lede">
              Type any topic and generate a structured syllabus with modules, subtopics,
              objectives, estimated study time, and a visual mindmap you can keep expanding.
            </p>
          </div>
          <form id="build" className="generator" onSubmit={generate}>
            <label>
              What can I help you learn?
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. quantum computing, jazz piano, medieval trade routes, startup finance" />
            </label>
            <label>
              Who is this for?
              <input value={audience} onChange={(e) => setAudience(e.target.value)} />
            </label>
            <label>
              Depth: {depth}
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
              <p className="eyebrow">Generated path</p>
              <h2>{course.topic}</h2>
              <p>{course.overview}</p>
            </div>
            <div className="tabs">
              <button className={view === "course" ? "active" : ""} onClick={() => setView("course")}>Syllabus</button>
              <button className={view === "mindmap" ? "active" : ""} onClick={() => setView("mindmap")}>Mindmap</button>
            </div>
          </div>
          {view === "course" ? (
            <CourseTree nodes={course.nodes} onExpand={(path) => generate(undefined, path)} />
          ) : (
            <MindMap topic={course.topic} nodes={course.nodes} />
          )}
        </section>
      )}
    </main>
  );
}

