import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackCourse, makeId } from "@/lib/course";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { Course } from "@/lib/types";

const requestSchema = z.object({
  topic: z.string().min(2).max(180),
  audience: z.string().max(180).default("curious beginner"),
  depth: z.coerce.number().int().min(1).max(5).default(3),
  format: z.enum(["course", "roadmap", "mindmap"]).default("course"),
  parentPath: z.array(z.string()).default([]),
});

const systemPrompt = `You generate rigorous, structured learning syllabi. Return ONLY valid JSON with this exact shape:
{
  "overview": "string",
  "nodes": [{
    "title": "string",
    "summary": "string",
    "learningObjectives": ["string"],
    "estimatedMinutes": number,
    "difficulty": "beginner" | "intermediate" | "advanced",
    "children": []
  }]
}
Rules: create a clear hierarchy; avoid fluff; make subtopics concrete; children arrays can be nested up to requested depth; each node should be teachable.`;

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("The AI returned text instead of valid course JSON.");
  }
}

function attachIds(course: Omit<Course, "id" | "createdAt">): Course {
  const withIds = (nodes: any[]): any[] => nodes.map((node) => ({
    id: makeId("node"),
    title: String(node.title || "Untitled topic"),
    summary: String(node.summary || ""),
    learningObjectives: Array.isArray(node.learningObjectives) ? node.learningObjectives.map(String).slice(0, 6) : [],
    estimatedMinutes: Number(node.estimatedMinutes || 20),
    difficulty: ["beginner", "intermediate", "advanced"].includes(node.difficulty) ? node.difficulty : "beginner",
    children: Array.isArray(node.children) ? withIds(node.children) : [],
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
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  let course: Course;

  if (!apiKey) {
    course = fallbackCourse(topic, audience, depth, format);
  } else {
    const prompt = parentPath.length
      ? `Expand this branch of a course on "${topic}" for ${audience}: ${parentPath.join(" > ")}. Generate children to depth ${depth}.`
      : `Create a ${format} syllabus for "${topic}" for ${audience}. Use depth ${depth}.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let aiRes: Response;

    try {
      aiRes = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          // Some OpenAI-compatible hosts reject strict JSON mode; the prompt and parser handle JSON instead.
          temperature: 0.35,
          max_tokens: 5000,
        }),
      });
    } catch (err) {
      const message = err instanceof Error && err.name === "AbortError"
        ? "AI request timed out after 120 seconds. Try a lower depth or a more specific topic."
        : "AI request could not be completed.";
      return NextResponse.json({ error: message }, { status: 504 });
    } finally {
      clearTimeout(timeout);
    }

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return NextResponse.json({ error: `AI request failed: ${text}` }, { status: 502 });
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let generated;
    try {
      generated = extractJson(content);
    } catch (err) {
      console.error("AI JSON parse failed", { err, content: content.slice(0, 1000) });
      course = fallbackCourse(topic, audience, depth, format);
      return NextResponse.json({ course, warning: "AI returned malformed JSON, so a fallback course was generated." });
    }
    course = attachIds({
      topic,
      audience,
      depth,
      format,
      overview: generated.overview || `A generated learning path for ${topic}.`,
      nodes: Array.isArray(generated.nodes) ? generated.nodes : [],
    });
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
