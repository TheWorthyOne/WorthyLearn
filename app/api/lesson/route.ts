import { NextResponse } from "next/server";
import { z } from "zod";
import { callAiJson } from "@/lib/ai";
import { LessonContent } from "@/lib/types";

const requestSchema = z.object({
  courseTitle: z.string().min(2).max(220),
  audience: z.string().max(180).default("curious learner"),
  moduleTitle: z.string().min(2).max(220),
  lessonTitle: z.string().min(2).max(220),
  lessonNumber: z.string().optional(),
});

const systemPrompt = `You generate complete lesson pages for an AI course app. Return ONLY valid JSON:
{
  "title": "string",
  "lessonNumber": "string",
  "estimatedMinutes": number,
  "introduction": "2-4 paragraph intro",
  "sections": [{ "heading": "string", "body": "3-6 rich paragraphs with examples" }],
  "diagram": { "title": "string", "nodes": ["string"], "edges": [["source", "target"]] },
  "summary": "string",
  "checks": ["question or task"]
}
Rules:
- Make the lesson detailed and useful, like a textbook/tutorial page.
- Use 4-6 sections.
- For medical/science audiences, include mechanisms, high-yield relationships, examples, and caveats.
- Do not give personalized medical advice. Educational content only.
- Include a simple conceptual diagram as nodes and edges.`;

function fallbackLesson(courseTitle: string, moduleTitle: string, lessonTitle: string, audience: string): LessonContent {
  return {
    title: lessonTitle,
    lessonNumber: "Generated lesson",
    estimatedMinutes: 25,
    introduction: `This lesson introduces ${lessonTitle} as part of ${moduleTitle} in ${courseTitle}. It is tuned for ${audience}.`,
    sections: [
      { heading: "Core idea", body: `The central goal is to understand the major concepts behind ${lessonTitle}, why they matter, and how they connect to the broader course.` },
      { heading: "Key mechanisms", body: `Focus on the causal relationships, vocabulary, and common examples that make this lesson useful in practice.` },
      { heading: "Applied example", body: `Work through a representative case or scenario and identify the assumptions, important variables, and likely pitfalls.` },
      { heading: "Common mistakes", body: `Avoid memorizing isolated facts. Instead, connect each fact to a mechanism, context, or practical decision point.` },
    ],
    diagram: {
      title: `${lessonTitle} concept map`,
      nodes: [moduleTitle, lessonTitle, "Key mechanisms", "Examples", "Applications"],
      edges: [[moduleTitle, lessonTitle], [lessonTitle, "Key mechanisms"], ["Key mechanisms", "Examples"], ["Examples", "Applications"]],
    },
    summary: `${lessonTitle} is a teachable component of ${moduleTitle}; mastery requires vocabulary, mechanisms, examples, and applied reasoning.`,
    checks: ["Explain the concept in your own words.", "Name one realistic application.", "Identify one common misconception."],
  };
}

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { courseTitle, audience, moduleTitle, lessonTitle, lessonNumber } = parsed.data;

  if (!process.env.AI_API_KEY) {
    return NextResponse.json({ lesson: fallbackLesson(courseTitle, moduleTitle, lessonTitle, audience) });
  }

  const prompt = `Course: ${courseTitle}\nAudience: ${audience}\nModule: ${moduleTitle}\nLesson: ${lessonTitle}\nLesson number: ${lessonNumber || ""}\nGenerate the full lesson page.`;
  const { generated, attempts, fatal } = await callAiJson(prompt, systemPrompt);

  if (fatal) {
    return NextResponse.json({ error: fatal }, { status: 502 });
  }

  if (!generated) {
    return NextResponse.json({
      lesson: fallbackLesson(courseTitle, moduleTitle, lessonTitle, audience),
      warning: `All configured AI models failed, so fallback lesson content was generated. Attempts: ${attempts.join(" | ")}`,
    });
  }

  const lesson: LessonContent = {
    title: String(generated.title || lessonTitle),
    lessonNumber: generated.lessonNumber ? String(generated.lessonNumber) : lessonNumber,
    estimatedMinutes: Number(generated.estimatedMinutes || 25),
    introduction: String(generated.introduction || ""),
    sections: Array.isArray(generated.sections) ? generated.sections.slice(0, 8).map((section: any) => ({
      heading: String(section.heading || "Section"),
      body: String(section.body || ""),
    })) : [],
    diagram: generated.diagram && Array.isArray(generated.diagram.nodes) ? {
      title: String(generated.diagram.title || `${lessonTitle} concept map`),
      nodes: generated.diagram.nodes.map(String).slice(0, 12),
      edges: Array.isArray(generated.diagram.edges) ? generated.diagram.edges.slice(0, 16).map((edge: any) => [String(edge[0]), String(edge[1])] as [string, string]) : [],
    } : undefined,
    summary: String(generated.summary || ""),
    checks: Array.isArray(generated.checks) ? generated.checks.map(String).slice(0, 8) : [],
  };

  return NextResponse.json({ lesson });
}
