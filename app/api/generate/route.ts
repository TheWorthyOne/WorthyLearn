import { NextResponse } from "next/server";
import { z } from "zod";
import { callAiJson } from "@/lib/ai";
import { fallbackCourse, makeId } from "@/lib/course";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { Course } from "@/lib/types";

const requestSchema = z.object({
  topic: z.string().min(2).max(180),
  audience: z.string().max(180).default("curious beginner"),
  depth: z.coerce.number().int().min(1).max(5).default(2),
  format: z.enum(["course", "roadmap", "mindmap"]).default("course"),
  parentPath: z.array(z.string()).default([]),
});

const systemPrompt = `You generate rigorous, roadmap.sh-style course syllabi. Return ONLY valid JSON with this exact shape:
{
  "overview": "string",
  "nodes": [{
    "kind": "module",
    "title": "Module 1: string",
    "summary": "string",
    "learningObjectives": ["string"],
    "estimatedMinutes": number,
    "difficulty": "beginner" | "intermediate" | "advanced",
    "children": [{
      "kind": "lesson",
      "title": "string",
      "summary": "string",
      "learningObjectives": ["string"],
      "estimatedMinutes": number,
      "difficulty": "beginner" | "intermediate" | "advanced",
      "children": []
    }]
  }]
}
Rules:
- Depth 1: EXACTLY 5 modules, EXACTLY 4 lessons each.
- Depth 2: EXACTLY 7 modules, EXACTLY 5 lessons each, 35 total lessons.
- Depth 3+: EXACTLY 8 modules, EXACTLY 6 lessons each, 48 total lessons.
- Each lesson must be a concrete teachable lesson, not a vague category.
- For medical/life-science audiences, use appropriate professional vocabulary and exam/clinical/research relevance.
- Include practical/case/data-analysis lessons where useful.
- Avoid fluff. Make it look like a serious course syllabus.`;

function lessonCount(course: Course) {
  return course.nodes.reduce((sum, module) => sum + module.children.length, 0);
}

function fillSparseCourse(course: Course): Course {
  const targetModules = course.depth >= 3 ? 8 : course.depth >= 2 ? 7 : 5;
  const targetLessonsPerModule = course.depth >= 3 ? 6 : course.depth >= 2 ? 5 : 4;
  const fallback = fallbackCourse(course.topic, course.audience, course.depth, course.format);
  const nodes = [...course.nodes];

  while (nodes.length < targetModules) {
    const fallbackModule = fallback.nodes[nodes.length % fallback.nodes.length];
    nodes.push({ ...fallbackModule, id: makeId("module") });
  }

  const filled = nodes.slice(0, targetModules).map((module, moduleIndex) => {
    const children = [...module.children];
    const fallbackChildren = fallback.nodes[moduleIndex % fallback.nodes.length].children;
    while (children.length < targetLessonsPerModule) {
      const fallbackLesson = fallbackChildren[children.length % fallbackChildren.length];
      children.push({ ...fallbackLesson, id: makeId("lesson") });
    }
    return { ...module, children: children.slice(0, targetLessonsPerModule) };
  });

  return { ...course, nodes: filled };
}

function attachIds(course: Omit<Course, "id" | "createdAt">): Course {
  const withIds = (nodes: any[], fallbackKind: "module" | "lesson" = "module"): any[] => nodes.map((node) => ({
    id: makeId(node.kind === "lesson" || fallbackKind === "lesson" ? "lesson" : "module"),
    kind: node.kind === "lesson" || fallbackKind === "lesson" ? "lesson" : "module",
    title: String(node.title || "Untitled topic"),
    summary: String(node.summary || ""),
    learningObjectives: Array.isArray(node.learningObjectives) ? node.learningObjectives.map(String).slice(0, 6) : [],
    estimatedMinutes: Number(node.estimatedMinutes || 25),
    difficulty: ["beginner", "intermediate", "advanced"].includes(node.difficulty) ? node.difficulty : "beginner",
    children: Array.isArray(node.children) ? withIds(node.children, "lesson") : [],
  }));

  return {
    id: makeId("course"),
    createdAt: new Date().toISOString(),
    ...course,
    nodes: withIds(course.nodes),
  };
}

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { topic, audience, depth, format, parentPath } = parsed.data;

  let course: Course;

  if (!process.env.AI_API_KEY) {
    course = fallbackCourse(topic, audience, depth, format);
  } else {
    const prompt = parentPath.length
      ? `Expand this branch of a course on "${topic}" for ${audience}: ${parentPath.join(" > ")}. Generate 5-7 concrete child lessons or sublessons. Use the same JSON shape.`
      : `Create a ${format} syllabus for "${topic}" for ${audience}. Requested depth: ${depth}. If depth is 2, you MUST produce exactly 7 modules with exactly 5 lessons in each module. Keep summaries concise so the JSON fits.`;

    const { generated, attempts, fatal } = await callAiJson(prompt, systemPrompt);

    if (fatal) {
      return NextResponse.json({ error: fatal }, { status: 502 });
    }

    if (!generated) {
      course = fallbackCourse(topic, audience, depth, format);
      return NextResponse.json({
        course,
        warning: `All configured AI models failed, so a fallback course was generated. Attempts: ${attempts.join(" | ")}`,
      });
    }

    course = attachIds({
      topic,
      audience,
      depth,
      format,
      overview: generated.overview || `A generated learning path for ${topic}.`,
      nodes: Array.isArray(generated.nodes) ? generated.nodes : [],
    });

    if (!parentPath.length && lessonCount(course) < (depth >= 2 ? 30 : 16)) {
      course = fillSparseCourse(course);
      course.overview = `${course.overview} Additional modules and lessons were added to reach the requested course depth.`;
    }
  }

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("courses").insert({
      id: course.id,
      topic: course.topic,
      audience: course.audience,
      depth: course.depth,
      format: course.format,
      overview: course.overview,
      content: course,
    });
  }

  return NextResponse.json({ course });
}
