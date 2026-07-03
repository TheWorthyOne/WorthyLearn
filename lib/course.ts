import { Course, CourseNode } from "./types";

const fallbackModules = [
  "Foundational Concepts and Vocabulary",
  "Structures, Systems, and Mechanisms",
  "Core Processes and Regulation",
  "Applied Analysis and Case Reasoning",
  "Advanced Integration and Edge Cases",
  "Projects, Practice, and Mastery",
];

const fallbackLessons = [
  "Key terminology and conceptual map",
  "Primary mechanisms and causal relationships",
  "Important examples and representative cases",
  "Common misconceptions and failure modes",
  "Applied practice: guided analysis",
];

export function makeId(prefix = "node") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function fallbackCourse(topic: string, audience: string, depth: number, format: Course["format"]): Course {
  return {
    id: makeId("course"),
    topic,
    audience,
    depth,
    format,
    createdAt: new Date().toISOString(),
    overview: `A generated learning path for ${topic}, tuned for ${audience || "self-guided learners"}.`,
    nodes: fallbackModules.map((title, moduleIndex) => ({
      id: makeId("module"),
      kind: "module",
      title: `Module ${moduleIndex + 1}: ${title}`,
      summary: `A major unit covering ${title.toLowerCase()} in the context of ${topic}.`,
      learningObjectives: [
        `Build a structured mental model of ${title.toLowerCase()}`,
        `Connect the module to the rest of ${topic}`,
        `Apply the material through guided practice`,
      ],
      estimatedMinutes: 120,
      difficulty: moduleIndex < 2 ? "beginner" : moduleIndex < 4 ? "intermediate" : "advanced",
      children: fallbackLessons.map((lesson, lessonIndex) => ({
        id: makeId("lesson"),
        kind: "lesson",
        title: lesson,
        summary: `A focused lesson on ${lesson.toLowerCase()} for ${topic}.`,
        learningObjectives: [
          `Explain the key ideas clearly`,
          `Recognize high-yield patterns and examples`,
          `Use the concept in a realistic scenario`,
        ],
        estimatedMinutes: 25 + lessonIndex * 5,
        difficulty: moduleIndex < 2 ? "beginner" : moduleIndex < 4 ? "intermediate" : "advanced",
        children: [],
      })),
    })),
  };
}

export function flattenNodes(nodes: CourseNode[], depth = 0, parentId?: string): Array<CourseNode & { depth: number; parentId?: string }> {
  return nodes.flatMap((node) => [
    { ...node, depth, parentId },
    ...flattenNodes(node.children, depth + 1, node.id),
  ]);
}
